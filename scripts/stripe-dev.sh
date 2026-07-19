#!/usr/bin/env bash
set -euo pipefail

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI is required: https://docs.stripe.com/stripe-cli"
  exit 1
fi

APP_PORT="${PORT:-3000}"
FORWARD_URL="${STRIPE_FORWARD_URL:-http://localhost:${APP_PORT}/api/webhooks/stripe}"
EVENTS="checkout.session.completed,checkout.session.async_payment_succeeded,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted"

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$APP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $APP_PORT is already in use. Stop the existing dev server, then rerun npm run dev:stripe."
  exit 1
fi

# Use the same test account as the application, even if Stripe CLI is logged
# into a different default account. The key is never printed or persisted.
if [[ -z "${STRIPE_API_KEY:-}" && -f .env.local ]]; then
  STRIPE_API_KEY="$(node -e '
    const fs = require("fs");
    const line = fs.readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((item) => item.startsWith("STRIPE_SECRET_KEY="));
    if (line) process.stdout.write(line.slice(line.indexOf("=") + 1));
  ')"
fi
if [[ -z "${STRIPE_API_KEY:-}" ]]; then
  echo "STRIPE_SECRET_KEY is missing from .env.local."
  exit 1
fi

# One listener owns both the temporary signing secret and event forwarding.
# Keeping these in the same process avoids a secret/listener mismatch.
PIPE_DIR="$(mktemp -d)"
LISTENER_PIPE="$PIPE_DIR/stripe-listener"
mkfifo "$LISTENER_PIPE"
STRIPE_API_KEY="$STRIPE_API_KEY" stripe listen --skip-update --events "$EVENTS" --forward-to "$FORWARD_URL" >"$LISTENER_PIPE" 2>&1 &
LISTENER_PID="$!"
NEXT_PID=""

cleanup() {
  if [[ -n "$NEXT_PID" ]]; then kill "$NEXT_PID" 2>/dev/null || true; fi
  kill "$LISTENER_PID" 2>/dev/null || true
  rm -f "$LISTENER_PIPE"
  rmdir "$PIPE_DIR" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

WEBHOOK_SECRET=""
exec 3<"$LISTENER_PIPE"
while IFS= read -r line <&3; do
  if [[ "$line" =~ (whsec_[A-Za-z0-9_]+) ]]; then
    WEBHOOK_SECRET="${BASH_REMATCH[1]}"
    break
  fi
  echo "$line"
done

if [[ -z "$WEBHOOK_SECRET" ]]; then
  echo "Stripe listener exited before producing a webhook secret. Check STRIPE_SECRET_KEY and retry."
  exit 1
fi

echo "Stripe listener ready; temporary webhook secret injected into Next.js (not written to disk)."
STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET" npm run dev -- --port "$APP_PORT" &
NEXT_PID="$!"

# Keep showing delivery logs without printing the signing secret.
while IFS= read -r line <&3; do
  echo "$line"
done

wait "$NEXT_PID"
