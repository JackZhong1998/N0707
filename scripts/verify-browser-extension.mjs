import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const extensionRoot = path.join(root, 'browser-extension');
const manifest = JSON.parse(
  fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8')
);

const catalogSandbox = { globalThis: {} };
vm.runInNewContext(
  fs.readFileSync(
    path.join(extensionRoot, 'directories/catalog.js'),
    'utf8'
  ),
  catalogSandbox
);
const catalog = catalogSandbox.globalThis.NowBuildDirectoryCatalog;
const errors = [];

if (catalog.version !== manifest.version) {
  errors.push(
    `Catalog version ${catalog.version} differs from manifest ${manifest.version}`
  );
}

const appVersionSource = fs.readFileSync(
  path.join(root, 'src/lib/gtm/publisher-extension-version.ts'),
  'utf8'
);
const appVersion = appVersionSource.match(
  /PUBLISHER_EXTENSION_VERSION\s*=\s*['"]([^'"]+)/
)?.[1];
if (appVersion !== manifest.version) {
  errors.push(
    `App version ${appVersion || 'missing'} differs from manifest ${manifest.version}`
  );
}

const ids = new Set();
const hosts = new Map();
const allowedRequirementKeys = new Set([
  'productName',
  'productUrl',
  'tagline',
  'shortDescription',
  'longDescription',
  'categories',
  'tags',
  'pricing',
  'founderName',
  'founderEmail',
  'founderUrl',
  'twitterUrl',
  'linkedinUrl',
  'demoUrl',
  'launchDate',
  'logo',
  'screenshots',
]);
const safeAutoSubmitIds = new Set([
  'micro_saas_examples',
  'llm_relevance',
  'build_voyage',
]);
for (const directory of catalog.directories) {
  if (ids.has(directory.id)) errors.push(`Duplicate directory id: ${directory.id}`);
  ids.add(directory.id);
  if (!directory.submitUrl) {
    errors.push(`Directory ${directory.id} has no submitUrl`);
  }
  if (!Array.isArray(directory.requirements) || !directory.requirements.length) {
    errors.push(`Directory ${directory.id} has no material requirements`);
  }
  for (const requirement of directory.requirements || []) {
    if (!allowedRequirementKeys.has(requirement.key)) {
      errors.push(
        `Directory ${directory.id} has unknown requirement ${requirement.key}`
      );
    }
    if (!['ai', 'user'].includes(requirement.resolution)) {
      errors.push(
        `Directory ${directory.id} has invalid resolution for ${requirement.key}`
      );
    }
    if (requirement.required !== true && requirement.required !== false) {
      errors.push(
        `Directory ${directory.id} requirement ${requirement.key} lacks required flag`
      );
    }
    if (requirement.assetSpec) {
      const spec = requirement.assetSpec;
      if (
        !(spec.width > 0) ||
        !(spec.height > 0) ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(spec.type)
      ) {
        errors.push(
          `Directory ${directory.id} has invalid asset spec for ${requirement.key}`
        );
      }
    }
  }
  if (!['prepare_only', 'auto_submit_opt_in'].includes(directory.submissionPolicy)) {
    errors.push(`Directory ${directory.id} has invalid submission policy`);
  }
  if (directory.submissionPolicy === 'auto_submit_opt_in') {
    if (!safeAutoSubmitIds.has(directory.id)) {
      errors.push(`Directory ${directory.id} is not on the auto-submit whitelist`);
    }
    if (directory.pricing !== 'Free' || directory.blocker) {
      errors.push(
        `Directory ${directory.id} cannot auto-submit because it is not unblocked and free`
      );
    }
  }
  for (const host of directory.hosts || []) {
    const normalized = host.replace(/^www\./, '');
    const existing = hosts.get(normalized);
    if (existing && existing !== directory.id) {
      errors.push(
        `Host ${normalized} is shared by ${existing} and ${directory.id}`
      );
    }
    hosts.set(normalized, directory.id);
  }
}
for (const directoryId of safeAutoSubmitIds) {
  const directory = catalog.byId(directoryId);
  if (directory?.submissionPolicy !== 'auto_submit_opt_in') {
    errors.push(`Safe auto-submit directory ${directoryId} is not opted in`);
  }
}

const declaredHosts = new Set(
  manifest.host_permissions.map((pattern) =>
    pattern
      .replace(/^https?:\/\//, '')
      .replace(/\/\*$/, '')
      .replace(/^\*\./, '')
      .replace(/^www\./, '')
  )
);
for (const [host, directoryId] of hosts) {
  if (
    ![...declaredHosts].some(
      (declared) => host === declared || host.endsWith(`.${declared}`)
    )
  ) {
    errors.push(`Missing host permission for ${directoryId}: ${host}`);
  }
}

for (const script of manifest.content_scripts || []) {
  for (const file of script.js || []) {
    if (!fs.existsSync(path.join(extensionRoot, file))) {
      errors.push(`Missing content script file: ${file}`);
    }
  }
  for (const pattern of script.matches || []) {
    if (/^http:\/\/(?:localhost|127\.0\.0\.1)\//.test(pattern)) continue;
    if (!manifest.host_permissions.includes(pattern)) {
      const normalized = pattern
        .replace(/^https?:\/\//, '')
        .replace(/\/\*$/, '')
        .replace(/^\*\./, '')
        .replace(/^www\./, '');
      if (
        ![...declaredHosts].some(
          (declared) =>
            normalized === declared || normalized.endsWith(`.${declared}`)
        )
      ) {
        errors.push(`Content-script match lacks host permission: ${pattern}`);
      }
    }
  }
}

const widgetScript = manifest.content_scripts?.find((script) =>
  script.js?.includes('directories/jotform-widget.js')
);
for (const requiredMatch of [
  'https://app-widgets.jotform.io/*',
  'https://widgets.jotform.io/*',
]) {
  if (!widgetScript?.matches?.includes(requiredMatch)) {
    errors.push(`Jotform widget bridge missing match: ${requiredMatch}`);
  }
}
if (!widgetScript?.all_frames) {
  errors.push('Jotform widget bridge must run in all_frames');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  JSON.stringify({
    version: manifest.version,
    directories: catalog.directories.length,
    catalogHosts: hosts.size,
    contentScripts: manifest.content_scripts.length,
    verified: true,
  })
);
