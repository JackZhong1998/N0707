import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const sourcePath = path.join(root, 'src/lib/directories/data.ts');
const catalogPath = path.join(root, 'browser-extension/directories/catalog.js');
const outputPath = path.join(
  root,
  'browser-extension/directories/recording-progress.json'
);

const source = fs.readFileSync(sourcePath, 'utf8');
const declaration = 'export const launchDirectories: LaunchDirectory[] = ';
const arrayStart = source.indexOf('[', source.indexOf(declaration) + declaration.length);
const arrayEnd = source.lastIndexOf('];');
const directories = JSON.parse(source.slice(arrayStart, arrayEnd + 1));

const sandbox = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(catalogPath, 'utf8'), sandbox);
const catalog = sandbox.globalThis.NowBuildDirectoryCatalog.directories;
const byDomain = new Map();
for (const item of catalog) {
  for (const host of item.hosts) byDomain.set(host.replace(/^www\./, ''), item);
}

const previous = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  : { directories: [] };
const previousByDomain = new Map(
  previous.directories.map((item) => [item.domain, item])
);

const rows = directories.map((item) => {
  const domain = item.domain.replace(/^www\./, '');
  const adapter = byDomain.get(domain);
  const old = previousByDomain.get(domain);
  const inferredStatus = adapter
    ? adapter.blocker
      ? 'blocked'
      : ['profile_gate', 'dynamic_launch_gate', 'account_gate'].includes(
            adapter.entryStage
          )
        ? 'blocked'
        : ['login_then_form'].includes(adapter.entryStage)
          ? 'entry_verified'
          : 'configured'
    : 'pending';
  return {
    sourceOrder: item.sourceOrder,
    name: item.name,
    domain,
    homeUrl: item.url,
    pricing: item.pricing,
    status: old?.status || inferredStatus,
    adapterId: adapter?.id || null,
    submitUrl: adapter?.submitUrl || null,
    entryStage: adapter?.entryStage || null,
    blocker: old?.blocker || adapter?.blocker || null,
    notes: old?.notes || adapter?.notes || null,
    checkedAt: old?.checkedAt || null,
  };
});

const counts = rows.reduce((result, item) => {
  result[item.status] = (result[item.status] || 0) + 1;
  return result;
}, {});

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      extensionVersion:
        sandbox.globalThis.NowBuildDirectoryCatalog.version,
      sourceCount: rows.length,
      counts,
      directories: rows,
    },
    null,
    2
  )}\n`
);

console.log(JSON.stringify({ outputPath, sourceCount: rows.length, counts }));
