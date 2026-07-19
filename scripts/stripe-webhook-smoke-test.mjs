import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import { spawn } from 'node:child_process';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function readEnvFile(path) {
  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(() => (port ? resolve(port) : reject(new Error('No test port'))));
    });
  });
}

async function temporaryWebhookSecret(stripeApiKey) {
  return new Promise((resolve, reject) => {
    const child = spawn('stripe', ['listen', '--print-secret', '--skip-update'], {
      env: { ...process.env, STRIPE_API_KEY: stripeApiKey },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const match = output.match(/whsec_[A-Za-z0-9_]+/);
      if (code === 0 && match) resolve(match[0]);
      else reject(new Error('Stripe CLI could not generate a temporary webhook secret'));
    });
  });
}

async function waitForNext(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Next.js did not start in time: ${output.slice(-1000)}`));
    }, 45_000);
    const inspect = (chunk) => {
      output += chunk.toString();
      if (output.includes('Ready in')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      if (!output.includes('Ready in')) {
        clearTimeout(timeout);
        reject(new Error(`Next.js exited before ready (${code}): ${output.slice(-1000)}`));
      }
    });
  });
}

const fileEnv = readEnvFile('.env.local');
const adminKey = fileEnv.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
assert(fileEnv.STRIPE_SECRET_KEY?.startsWith('sk_test_'), 'A Stripe test secret key is required');
assert(fileEnv.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL is missing');
assert(adminKey, 'Supabase server key is missing');

const webhookSecret = await temporaryWebhookSecret(fileEnv.STRIPE_SECRET_KEY);
const port = await availablePort();
const eventId = `evt_codex_webhook_${crypto.randomUUID()}`;
const stripe = new Stripe(fileEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});
const supabase = createClient(fileEnv.NEXT_PUBLIC_SUPABASE_URL, adminKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const next = spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
  cwd: process.cwd(),
  detached: true,
  env: {
    ...process.env,
    ...fileEnv,
    STRIPE_WEBHOOK_SECRET: webhookSecret,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let result;
try {
  await waitForNext(next);
  const payload = JSON.stringify({
    id: eventId,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: `obj_${crypto.randomUUID()}` } },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'codex.smoke_test',
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  const response = await fetch(`http://127.0.0.1:${port}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: payload,
  });
  const body = await response.json();
  assert(response.ok && body.received === true, `Webhook returned ${response.status}`);

  const ledger = await supabase
    .from('stripe_events')
    .select('type, status, livemode')
    .eq('id', eventId)
    .single();
  if (ledger.error) throw ledger.error;
  assert(ledger.data.status === 'processed', 'Webhook event was not marked processed');
  assert(ledger.data.livemode === false, 'Webhook smoke event unexpectedly used live mode');

  result = {
    temporarySecret: true,
    signatureVerification: true,
    webhookResponse: response.status,
    stripeEventLedger: ledger.data.status,
  };
} finally {
  await supabase.from('stripe_events').delete().eq('id', eventId);
  try {
    process.kill(-next.pid, 'SIGTERM');
  } catch {
    next.kill('SIGTERM');
  }
}

console.log(JSON.stringify(result, null, 2));
