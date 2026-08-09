import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const channelMapPath = path.join(
  projectRoot,
  'src/lib/agents/skills/channel-map.ts'
);
const source = fs.readFileSync(channelMapPath, 'utf8');
const failures = [];
const warnings = [];

function captureQuotedIds(block) {
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

const sharedBlock = source.match(
  /CHANNEL_SHARED_SKILL_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/
);
const sharedSkillIds = sharedBlock ? captureQuotedIds(sharedBlock[1]) : [];
if (sharedSkillIds.length < 2) {
  failures.push('Expected both shared research and editorial Skills.');
}

function captureSkillArray(constName) {
  const block = source.match(
    new RegExp(`${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*(?:as const)?`)
  );
  return block ? captureQuotedIds(block[1]) : [];
}

const recommenderSkillIds = captureSkillArray('CHANNEL_RECOMMENDER_SKILL_IDS');
if (recommenderSkillIds.length === 0) failures.push('Channel recommender Skills are missing.');

const channels = [...source.matchAll(/channelId:\s*'([^']+)'[\s\S]*?skillIds:\s*\[([^\]]*)\]/g)].map(
  (match) => ({
    channelId: match[1],
    planningSkillIds: [...new Set(captureQuotedIds(match[2]))],
    writingSkillIds: [
      ...new Set([...sharedSkillIds, ...captureQuotedIds(match[2])]),
    ],
  })
);
if (channels.length === 0) failures.push('No channel definitions found.');
if (!channels.some((channel) => channel.channelId === 'hacker_news')) {
  failures.push('Hacker News channel is missing.');
}

function skillPath(skillId) {
  if (skillId.startsWith('custom/')) {
    return path.join(
      projectRoot,
      'vendor/custom',
      skillId.slice('custom/'.length),
      'SKILL.md'
    );
  }
  if (skillId.startsWith('external/')) {
    return path.join(
      projectRoot,
      'vendor/external-skills',
      skillId.slice('external/'.length),
      'SKILL.md'
    );
  }
  return path.join(projectRoot, 'vendor/gingiris-skills', skillId, 'SKILL.md');
}

const fullContentCache = new Map();

function appendReferences(dir, content, rel = 'references') {
  if (!fs.existsSync(dir)) return content;

  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      content = appendReferences(full, content, `${rel}/${entry}`);
    } else {
      content += `\n\n---\n## Reference: ${rel}/${entry}\n\n`;
      content += fs.readFileSync(full, 'utf8');
    }
  }
  return content;
}

function fullSkillContent(skillId) {
  if (fullContentCache.has(skillId)) return fullContentCache.get(skillId);
  const file = skillPath(skillId);
  let content = fs.readFileSync(file, 'utf8');
  content = appendReferences(path.join(path.dirname(file), 'references'), content);
  fullContentCache.set(skillId, content);
  return content;
}

function combinedSkillLength(skillIds) {
  return skillIds
    .filter((skillId) => fs.existsSync(skillPath(skillId)))
    .map((skillId) => fullSkillContent(skillId))
    .join('\n\n---\n\n').length;
}

const uniqueSkillIds = [
  ...new Set([
    ...channels.flatMap((channel) => [
      ...channel.planningSkillIds,
      ...channel.writingSkillIds,
    ]),
    ...recommenderSkillIds,
  ]),
];
for (const skillId of uniqueSkillIds) {
  if (!skillId.startsWith('custom/')) {
    failures.push(
      `${skillId}: production mappings must use a reviewed custom Skill; keep upstream vendor copies inactive.`
    );
  }
  const file = skillPath(skillId);
  if (!fs.existsSync(file)) {
    failures.push(`${skillId}: SKILL.md is missing (${file})`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  if (!/^---\r?\n[\s\S]*?\r?\n---/.test(content)) {
    failures.push(`${skillId}: YAML frontmatter is missing.`);
  }
  if (!/^name:\s*.+$/m.test(content)) {
    failures.push(`${skillId}: frontmatter name is missing.`);
  }
  if (!/^description:\s*(?:\||>|.+)$/m.test(content)) {
    failures.push(`${skillId}: frontmatter description is missing.`);
  }
  if (content.length < 500) {
    warnings.push(`${skillId}: unusually short (${content.length} chars).`);
  }
  if (content.length > 80_000) {
    warnings.push(`${skillId}: unusually large (${content.length} chars).`);
  }
  const fullLength = fullSkillContent(skillId).length;
  if (fullLength > 20_000) {
    warnings.push(
      `${skillId}: full content is ${fullLength} chars and will be truncated when dynamically loaded.`
    );
  }
}

const channelContentLengths = new Map();
for (const channel of channels) {
  const combinedLength = combinedSkillLength(channel.writingSkillIds);
  channelContentLengths.set(channel.channelId, combinedLength);
  if (combinedLength > 40_000) {
    failures.push(
      `${channel.channelId}: combined Skill content is ${combinedLength} chars and exceeds the 40000-char runtime limit.`
    );
  } else if (combinedLength > 30_000) {
    warnings.push(
      `${channel.channelId}: combined Skill content is close to the runtime limit (${combinedLength} chars).`
    );
  }
}

const coreSkillGroups = [
  { name: 'channel_recommender', skillIds: recommenderSkillIds },
];
const coreContentLengths = new Map();
for (const group of coreSkillGroups) {
  const combinedLength = combinedSkillLength(group.skillIds);
  coreContentLengths.set(group.name, combinedLength);
  if (combinedLength > 40_000) {
    failures.push(
      `${group.name}: combined Skill content is ${combinedLength} chars and exceeds the 40000-char review limit.`
    );
  }
}

const externalManifestPath = path.join(
  projectRoot,
  'vendor/external-skills/manifest.json'
);
if (!fs.existsSync(externalManifestPath)) {
  failures.push('External Skill manifest is missing.');
} else {
  const manifest = JSON.parse(fs.readFileSync(externalManifestPath, 'utf8'));
  for (const entry of manifest.skills ?? []) {
    for (const field of ['skillId', 'source', 'commit', 'license', 'auditScore', 'decision']) {
      if (entry[field] === undefined || entry[field] === '') {
        failures.push(`${entry.skillId ?? 'unknown external skill'}: ${field} is missing.`);
      }
    }
    if (
      typeof entry.auditScore !== 'number' ||
      entry.auditScore < 0 ||
      entry.auditScore > 100
    ) {
      failures.push(`${entry.skillId}: auditScore must be between 0 and 100.`);
    }
    const file = skillPath(entry.skillId);
    if (!fs.existsSync(file)) {
      failures.push(`${entry.skillId}: vendored upstream copy is missing.`);
    }
  }
}

console.log(
  `Skill audit: ${channels.length} channels, ${uniqueSkillIds.length} runtime Skills, ${sharedSkillIds.length} shared Skills.`
);
for (const group of coreSkillGroups) {
  console.log(
    `- ${group.name} (${coreContentLengths.get(group.name)} chars): ${group.skillIds.join(', ')}`
  );
}
for (const channel of channels) {
  console.log(
    `- ${channel.channelId} (planning ${combinedSkillLength(channel.planningSkillIds)} chars; writing ${channelContentLengths.get(channel.channelId)} chars): ${channel.writingSkillIds.join(', ')}`
  );
}
for (const warning of warnings) console.warn(`WARN ${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Skill audit passed.');
}
