import fs from 'node:fs/promises';
import path from 'node:path';

const removedDomains = new Set([
  'versily.com',
  'solopush.com',
  'web-review.com',
  'techtrendin.com',
  'submithunt.com',
  'rankyourai.com',
  'launch.cab',
  'aat.ee',
  'bestofweb.site',
  'builtbyindies.com',
  'awesomeindie.com',
  'bulletin.so',
  'justgotfound.com',
  'launchvibe.app',
  'techcrunch.com',
]);

const directory = path.join(process.cwd(), 'browser-extension/directories');
const names = await fs.readdir(directory);
const auditFiles = names.filter(
  (name) => /^audit-(?:batch|updates)-.+\.json$/.test(name)
);

let removedAuditRecords = 0;
for (const name of auditFiles) {
  const file = path.join(directory, name);
  const records = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!Array.isArray(records)) continue;
  const kept = records.filter((record) => !removedDomains.has(record.domain));
  removedAuditRecords += records.length - kept.length;
  await fs.writeFile(file, `${JSON.stringify(kept, null, 2)}\n`);
}

const progressPath = path.join(directory, 'recording-progress.json');
const progress = JSON.parse(await fs.readFile(progressPath, 'utf8'));
const originalCount = progress.directories.length;
progress.directories = progress.directories.filter(
  (record) => !removedDomains.has(record.domain)
);
progress.sourceCount = progress.directories.length;
progress.counts = progress.directories.reduce((counts, record) => {
  counts[record.status] = (counts[record.status] || 0) + 1;
  return counts;
}, {});
await fs.writeFile(progressPath, `${JSON.stringify(progress, null, 2)}\n`);

console.log({
  removedAuditRecords,
  removedProgressRecords: originalCount - progress.directories.length,
  remainingProgressRecords: progress.directories.length,
});
