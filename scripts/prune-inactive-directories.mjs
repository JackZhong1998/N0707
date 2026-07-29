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

const root = process.cwd();
const inventoryPath = path.join(root, 'src/lib/directories/data.ts');
const profilesPath = path.join(
  root,
  'src/lib/directories/researched-profiles.json'
);

const inventorySource = await fs.readFile(inventoryPath, 'utf8');
const marker = inventorySource.indexOf('export const launchDirectories');
const start = inventorySource.indexOf(
  '[',
  inventorySource.indexOf('=', marker)
);
const end = inventorySource.lastIndexOf(']');
const inventory = JSON.parse(inventorySource.slice(start, end + 1));
const removedInventory = inventory.filter((item) =>
  removedDomains.has(item.domain)
);
const keptInventory = inventory.filter(
  (item) => !removedDomains.has(item.domain)
);

if (removedInventory.length !== removedDomains.size) {
  const found = new Set(removedInventory.map((item) => item.domain));
  const missing = [...removedDomains].filter((domain) => !found.has(domain));
  throw new Error(`Prune target missing from inventory: ${missing.join(', ')}`);
}

const rewrittenInventory = `${inventorySource.slice(0, start)}${JSON.stringify(
  keptInventory,
  null,
  2
)}${inventorySource.slice(end + 1)}`;
await fs.writeFile(inventoryPath, rewrittenInventory);

const profiles = JSON.parse(await fs.readFile(profilesPath, 'utf8'));
for (const domain of removedDomains) delete profiles[domain];
await fs.writeFile(profilesPath, `${JSON.stringify(profiles, null, 2)}\n`);

console.log({
  removed: removedInventory.map((item) => item.name),
  remainingDirectories: keptInventory.length,
  remainingResearchedProfiles: Object.keys(profiles).length,
});
