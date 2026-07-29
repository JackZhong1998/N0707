import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'src/lib/directories/data.ts');
const curatedPath = path.join(root, 'src/lib/directories/fit-profiles.ts');
const outputPath = path.join(
  root,
  'src/lib/directories/researched-profiles.json'
);
const progressPath = path.join(root, '.directory-research-progress.json');
const checkedAt = '2026-07-28';
const profileVersion = 2;

async function loadEnv() {
  const content = await fs.readFile(path.join(root, '.env.local'), 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function readInventory() {
  const source = await fs.readFile(dataPath, 'utf8');
  const marker = source.indexOf('export const launchDirectories');
  const start = source.indexOf('[', source.indexOf('=', marker));
  const end = source.lastIndexOf(']');
  return JSON.parse(source.slice(start, end + 1));
}

async function readCuratedDomains() {
  const source = await fs.readFile(curatedPath, 'utf8');
  return new Set(
    [...source.matchAll(/^  '([^']+)': \{/gm)].map((match) => match[1])
  );
}

function textFromHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8_000);
}

async function fetchEvidence(directory) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch(directory.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NowBuildDirectoryResearch/1.0; +https://nowbuild.ai)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    const html = contentType.includes('text/html')
      ? await response.text()
      : '';
    const text = textFromHtml(html);
    return {
      status: response.status,
      finalUrl: response.url || directory.url,
      text,
      accessible: response.ok && text.length >= 120,
    };
  } catch (error) {
    return {
      status: 0,
      finalUrl: directory.url,
      text: '',
      accessible: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function concurrentMap(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
      process.stdout.write(
        `\rFetched ${results.filter(Boolean).length}/${items.length}`
      );
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  process.stdout.write('\n');
  return results;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in response');
  return JSON.parse(source.slice(start, end + 1));
}

async function classifyBatch(batch) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const models = [
    process.env.OPENROUTER_MODEL,
    ...(process.env.OPENROUTER_FALLBACK_MODELS || '').split(','),
    'openai/gpt-5-mini',
  ]
    .map((model) => model?.trim())
    .filter(Boolean)
    .filter((model, index, all) => all.indexOf(model) === index);
  let lastError = 'No model available';
  for (const model of models) {
    let response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(90_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            process.env.NEXT_PUBLIC_APP_URL || 'https://nowbuild.ai',
          'X-Title': 'NowBuild Directory Research',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 7000,
          reasoning: { effort: 'none' },
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You classify which PRODUCTS are suitable for a launch platform from retrieved official-page evidence.
Never invent eligibility, pricing, traffic, or audience facts. Use only the supplied text.
productTypes means the kinds of user products the platform accepts or is relevant to, NOT services/features offered by the platform.
Use only these exact taxonomy values:
- productTypes: "SaaS", "AI tool", "Developer tool", "Mobile app", "Web app", "Desktop software", "Open source", "API", "Startup", "Physical tech", "Digital product", "Business software", "Consumer app", "Marketplace", "Content product"
- audiences: "Founders", "Developers", "Designers", "Marketers", "Sales teams", "Small businesses", "Enterprise buyers", "Consumers", "Creators", "AI adopters", "Early adopters", "Investors", "Tech professionals"
- stages: "Pre-launch", "Beta", "Launched", "Established", "Major update"
- goals: "Launch exposure", "Early users", "Feedback", "Software discovery", "AI discovery", "SEO discovery", "Reviews", "Buyer discovery", "Community discussion", "Press coverage", "Backlinks", "Deal exposure"
- markets: "B2B", "B2C", "Developer"
Do not include a value unless the official-page evidence supports it. Empty arrays are valid.
For an accessible page, evidenceLevel is "explicit" only when the page states the positioning; otherwise "inferred".
For inaccessible, parked, unrelated, or content-free pages, use evidenceLevel "unverified", confidence "low", empty arrays, and explain the failure.
Return one entry for every supplied domain as:
{"profiles":{"domain":{"productTypes":[],"audiences":[],"stages":[],"goals":[],"markets":["B2B"|"B2C"|"Developer"],"summary":{"en":"","zh":""},"evidenceLevel":"explicit"|"inferred"|"unverified","confidence":"high"|"medium"|"low","sourceUrl":"","lastVerified":"${checkedAt}" or ""}}}
Keep labels short, concrete, and in English. Summary must be factual and restrained. "lastVerified" is ${checkedAt} only when accessible evidence supports the profile; otherwise empty.`,
            },
            {
              role: 'user',
              content: JSON.stringify(
                batch.map(({ directory, evidence }) => ({
                  name: directory.name,
                  domain: directory.domain,
                  inventoryTags: directory.tags,
                  inventoryPricing: directory.pricing,
                  requestedUrl: directory.url,
                  retrievedUrl: evidence.finalUrl,
                  httpStatus: evidence.status,
                  accessible: evidence.accessible,
                  officialPageText: evidence.text.slice(0, 3500),
                }))
              ),
            },
          ],
        }),
      });
    } catch (error) {
      lastError = `${model} request failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      continue;
    }
    try {
      if (!response.ok) {
        lastError = `OpenRouter ${model} ${response.status}: ${(
          await response.text()
        ).slice(0, 500)}`;
        if ([403, 404, 429, 502, 503].includes(response.status)) continue;
        throw new Error(lastError);
      }
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        lastError = `Empty OpenRouter response from ${model}`;
        continue;
      }
      return extractJson(content).profiles || {};
    } catch (error) {
      lastError = `${model} response failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      continue;
    }
  }
  throw new Error(lastError);
}

function normalizeProfile(domain, directory, evidence, raw) {
  const evidenceLevels = new Set(['explicit', 'inferred', 'unverified']);
  const confidences = new Set(['high', 'medium', 'low']);
  const accessible = evidence.accessible;
  const evidenceLevel =
    accessible && evidenceLevels.has(raw?.evidenceLevel)
      ? raw.evidenceLevel
      : 'unverified';
  const confidence =
    accessible && confidences.has(raw?.confidence) ? raw.confidence : 'low';
  const array = (value, max = 12) =>
    [...new Set((Array.isArray(value) ? value : []).filter(
      (item) => typeof item === 'string' && item.trim()
    ).map((item) => item.trim().slice(0, 100)))].slice(0, max);
  const allowedProductTypes = new Set([
    'SaaS', 'AI tool', 'Developer tool', 'Mobile app', 'Web app',
    'Desktop software', 'Open source', 'API', 'Startup', 'Physical tech',
    'Digital product', 'Business software', 'Consumer app', 'Marketplace',
    'Content product',
  ]);
  const allowedAudiences = new Set([
    'Founders', 'Developers', 'Designers', 'Marketers', 'Sales teams',
    'Small businesses', 'Enterprise buyers', 'Consumers', 'Creators',
    'AI adopters', 'Early adopters', 'Investors', 'Tech professionals',
  ]);
  const allowedStages = new Set([
    'Pre-launch', 'Beta', 'Launched', 'Established', 'Major update',
  ]);
  const allowedGoals = new Set([
    'Launch exposure', 'Early users', 'Feedback', 'Software discovery',
    'AI discovery', 'SEO discovery', 'Reviews', 'Buyer discovery',
    'Community discussion', 'Press coverage', 'Backlinks', 'Deal exposure',
  ]);
  const only = (value, allowed, max = 12) =>
    array(value, max).filter((item) => allowed.has(item));
  const allowedMarkets = new Set(['B2B', 'B2C', 'Developer']);
  const markets = array(raw?.markets, 3).filter((item) =>
    allowedMarkets.has(item)
  );
  const fallbackEn = accessible
    ? `The official page was reachable, but its product fit remains unclear.`
    : `The official page could not be reliably retrieved; product fit is unverified.`;
  const fallbackZh = accessible
    ? '官网可以访问，但页面没有提供足够信息判断适合的产品。'
    : '未能可靠读取官网，平台适配性尚未核实。';
  return {
    productTypes:
      evidenceLevel === 'unverified'
        ? []
        : only(raw?.productTypes, allowedProductTypes),
    audiences:
      evidenceLevel === 'unverified'
        ? []
        : only(raw?.audiences, allowedAudiences),
    stages:
      evidenceLevel === 'unverified'
        ? []
        : only(raw?.stages, allowedStages),
    goals:
      evidenceLevel === 'unverified' ? [] : only(raw?.goals, allowedGoals),
    markets: evidenceLevel === 'unverified' ? [] : markets,
    summary: {
      en:
        typeof raw?.summary?.en === 'string'
          ? raw.summary.en.slice(0, 400)
          : fallbackEn,
      zh:
        typeof raw?.summary?.zh === 'string'
          ? raw.summary.zh.slice(0, 400)
          : fallbackZh,
    },
    evidenceLevel,
    confidence,
    sourceUrl: evidence.finalUrl || directory.url,
    lastVerified: evidenceLevel === 'unverified' ? '' : checkedAt,
  };
}

await loadEnv();
const inventory = await readInventory();
const curatedDomains = await readCuratedDomains();
const targets = inventory.filter(
  (directory) => !curatedDomains.has(directory.domain)
);
console.log(`Researching ${targets.length} non-curated directories`);

let progress = {};
try {
  progress = JSON.parse(await fs.readFile(progressPath, 'utf8'));
} catch {}

const missingEvidence = targets.filter(
  (directory) => !progress[directory.domain]?.evidence
);
const fetched = await concurrentMap(missingEvidence, 6, async (directory) => ({
  directory,
  evidence: await fetchEvidence(directory),
}));
for (const item of fetched) {
  progress[item.directory.domain] = item;
}
await fs.writeFile(progressPath, JSON.stringify(progress, null, 2));

for (const directory of targets) {
  const item = progress[directory.domain];
  if (item && !item.evidence.accessible) {
    item.profile = normalizeProfile(
      directory.domain,
      directory,
      item.evidence,
      {}
    );
    item.profileVersion = profileVersion;
  }
}
const pending = targets
  .map((directory) => progress[directory.domain])
  .filter(
    (item) =>
      item && item.evidence.accessible && item.profileVersion !== profileVersion
  );
for (let index = 0; index < pending.length; index += 3) {
  const batch = pending.slice(index, index + 3);
  const classified = await classifyBatch(batch);
  for (const item of batch) {
    item.profile = normalizeProfile(
      item.directory.domain,
      item.directory,
      item.evidence,
      classified[item.directory.domain]
    );
    item.profileVersion = profileVersion;
    progress[item.directory.domain] = item;
  }
  await fs.writeFile(progressPath, JSON.stringify(progress, null, 2));
  console.log(
    `Classified ${Math.min(index + batch.length, pending.length)}/${pending.length}`
  );
}

const profiles = Object.fromEntries(
  targets.map((directory) => [
    directory.domain,
    normalizeProfile(
      directory.domain,
      directory,
      progress[directory.domain]?.evidence || {
        accessible: false,
        finalUrl: directory.url,
        status: 0,
        text: '',
      },
      progress[directory.domain]?.profile || {}
    ),
  ])
);
await fs.writeFile(outputPath, `${JSON.stringify(profiles, null, 2)}\n`);

const counts = Object.values(profiles).reduce((acc, profile) => {
  acc[profile.evidenceLevel] = (acc[profile.evidenceLevel] || 0) + 1;
  return acc;
}, {});
console.log({ total: Object.keys(profiles).length, ...counts, outputPath });
