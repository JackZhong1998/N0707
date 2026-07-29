import fs from 'node:fs';
import path from 'node:path';

const ledgerPath = path.join(
  process.cwd(),
  'browser-extension/directories/recording-progress.json'
);
const updatesPath = process.argv[2];
if (!updatesPath) {
  throw new Error('Usage: node scripts/update-directory-recording-status.mjs updates.json');
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const parsedUpdates = JSON.parse(fs.readFileSync(updatesPath, 'utf8'));
const updates = Array.isArray(parsedUpdates)
  ? parsedUpdates
  : Array.isArray(parsedUpdates.sites)
    ? parsedUpdates.sites
    : [];
if (!updates.length) {
  throw new Error('Updates JSON must be an array or an object with a non-empty sites array');
}
const byDomain = new Map(updates.map((item) => [item.domain, item]));

for (const row of ledger.directories) {
  const update = byDomain.get(row.domain);
  if (!update) continue;
  Object.assign(row, update, { checkedAt: new Date().toISOString() });
}

ledger.counts = ledger.directories.reduce((result, item) => {
  result[item.status] = (result[item.status] || 0) + 1;
  return result;
}, {});
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ updated: updates.length, counts: ledger.counts }));
