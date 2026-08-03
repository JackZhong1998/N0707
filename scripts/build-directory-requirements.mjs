import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const extensionRoot = path.join(root, 'browser-extension', 'directories');
const outputPath = path.join(
  root,
  'src',
  'lib',
  'directories',
  'requirements.generated.json'
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeHost(value) {
  if (!value) return '';
  try {
    return new URL(value.includes('://') ? value : `https://${value}`)
      .hostname.replace(/^www\./, '')
      .toLowerCase();
  } catch {
    return String(value).replace(/^www\./, '').toLowerCase();
  }
}

function compactObservedFields(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (!item || typeof item !== 'object') return '';
          return String(
            item.key || item.name || item.label || item.field || item.title || ''
          ).trim();
        })
        .filter(Boolean)
    ),
  ].slice(0, 60);
}

const catalogSandbox = { globalThis: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(extensionRoot, 'catalog.js'), 'utf8'),
  catalogSandbox
);
const catalog = catalogSandbox.globalThis.NowBuildDirectoryCatalog;
const progress = readJson(path.join(extensionRoot, 'recording-progress.json'));

const progressByAdapter = new Map();
const progressByHost = new Map();
for (const item of progress.directories || []) {
  if (item.adapterId) progressByAdapter.set(item.adapterId, item);
  const host = normalizeHost(item.domain || item.homeUrl || item.submitUrl);
  if (host) progressByHost.set(host, item);
}

const auditByHost = new Map();
for (const fileName of fs.readdirSync(extensionRoot).sort()) {
  if (!/^(?:audit|deep-record).*\.json$/.test(fileName)) continue;
  const records = readJson(path.join(extensionRoot, fileName));
  if (!Array.isArray(records)) continue;
  for (const item of records) {
    const host = normalizeHost(item.domain || item.submitUrl);
    if (!host) continue;
    const current = auditByHost.get(host);
    const currentTime = Date.parse(current?.checkedAt || '') || 0;
    const nextTime = Date.parse(item.checkedAt || '') || 0;
    if (!current || nextTime >= currentTime) {
      auditByHost.set(host, { ...item, sourceFile: fileName });
    }
  }
}

function findByHost(index, hosts) {
  for (const host of hosts) {
    const normalized = normalizeHost(host);
    const exact = index.get(normalized);
    if (exact) return exact;
    for (const [candidate, value] of index) {
      if (
        candidate.endsWith(`.${normalized}`) ||
        normalized.endsWith(`.${candidate}`)
      ) {
        return value;
      }
    }
  }
  return undefined;
}

const directories = Object.fromEntries(
  catalog.directories.map((directory) => {
    const recording =
      progressByAdapter.get(directory.id) ||
      findByHost(progressByHost, directory.hosts);
    const audit = findByHost(auditByHost, directory.hosts);
    const observedFields = compactObservedFields(audit?.fields);
    const observedImageFields = compactObservedFields(audit?.imageFields);

    return [
      directory.id,
      {
        id: directory.id,
        name: directory.name,
        submitUrl: directory.submitUrl,
        hosts: directory.hosts,
        pricing: directory.pricing,
        entryStage: directory.entryStage,
        blocker: directory.blocker || null,
        requirementsConfidence: directory.requirementsConfidence,
        submissionPolicy: directory.submissionPolicy,
        requirements: directory.requirements,
        evidence: {
          catalog: 'browser-extension/directories/catalog.js',
          recordingStatus: recording?.status || null,
          checkedAt: audit?.checkedAt || recording?.checkedAt || null,
          sourceFile: audit?.sourceFile || 'recording-progress.json',
          observedFields,
          observedImageFields,
        },
      },
    ];
  })
);

const requirementCounts = {};
for (const directory of Object.values(directories)) {
  for (const requirement of directory.requirements) {
    requirementCounts[requirement.key] =
      (requirementCounts[requirement.key] || 0) + 1;
  }
}

const output = {
  schemaVersion: 1,
  catalogVersion: catalog.version,
  directoryCount: catalog.directories.length,
  requirementCounts,
  directories,
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, 'utf8')
    : '';
  if (existing !== serialized) {
    console.error(
      'Directory requirements are stale. Run npm run directories:requirements.'
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, serialized);
}

console.log(
  JSON.stringify({
    catalogVersion: catalog.version,
    directories: catalog.directories.length,
    requirementCounts,
    checked: process.argv.includes('--check'),
  })
);
