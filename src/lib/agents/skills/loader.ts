import fs from 'fs';
import path from 'path';

const GINGIRIS_ROOT = path.join(process.cwd(), 'vendor/gingiris-skills');
const CUSTOM_ROOT = path.join(process.cwd(), 'vendor/custom');

const contentCache = new Map<string, string>();

function skillDir(skillId: string): string {
  if (skillId.startsWith('custom/')) {
    return path.join(CUSTOM_ROOT, skillId.replace('custom/', ''));
  }
  return path.join(GINGIRIS_ROOT, skillId);
}

function appendReferences(dir: string, content: string, rel = 'references'): string {
  if (!fs.existsSync(dir)) return content;

  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      content = appendReferences(full, content, `${rel}/${entry}`);
    } else {
      content += `\n\n---\n## Reference: ${rel}/${entry}\n\n`;
      content += fs.readFileSync(full, 'utf-8');
    }
  }
  return content;
}

/** 读取 SKILL.md 原文 + references/ 子目录（不改写） */
export function getSkillFullContent(skillId: string): string {
  const cached = contentCache.get(skillId);
  if (cached) return cached;

  const dir = skillDir(skillId);
  const skillMd = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    throw new Error(`SKILL.md not found: ${skillId}`);
  }

  let content = fs.readFileSync(skillMd, 'utf-8');
  content = appendReferences(path.join(dir, 'references'), content);

  contentCache.set(skillId, content);
  return content;
}

/** 合并多个 Skill 原文（主 Skill 在前） */
export function getCombinedSkillContent(skillIds: string[]): string {
  return skillIds.map((id) => getSkillFullContent(id)).join('\n\n---\n\n');
}

export function skillExists(skillId: string): boolean {
  return fs.existsSync(path.join(skillDir(skillId), 'SKILL.md'));
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  version?: string;
}

export function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const meta: SkillFrontmatter = {};
  const block = match[1];

  const nameMatch = block.match(/^name:\s*(.+)$/m);
  if (nameMatch) meta.name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');

  const versionMatch = block.match(/^version:\s*(.+)$/m);
  if (versionMatch) meta.version = versionMatch[1].trim();

  const descMatch = block.match(/^description:\s*\|\s*\r?\n((?:[ \t].*\r?\n?)*)/m);
  if (descMatch) {
    meta.description = descMatch[1]
      .split('\n')
      .map((line) => line.replace(/^[ \t]/, ''))
      .join('\n')
      .trim();
  } else {
    const descSingle = block.match(/^description:\s*(.+)$/m);
    if (descSingle) meta.description = descSingle[1].trim();
  }

  return meta;
}

export function getSkillMeta(skillId: string): SkillFrontmatter & { skillId: string } {
  const content = getSkillFullContent(skillId);
  return { skillId, ...parseSkillFrontmatter(content) };
}

export function listGingirisSkillIds(): string[] {
  if (!fs.existsSync(GINGIRIS_ROOT)) return [];
  return fs
    .readdirSync(GINGIRIS_ROOT)
    .filter((name) => fs.existsSync(path.join(GINGIRIS_ROOT, name, 'SKILL.md')))
    .sort();
}

export function listAllSkillIds(): string[] {
  const gingiris = listGingirisSkillIds();
  const custom: string[] = [];
  if (fs.existsSync(CUSTOM_ROOT)) {
    for (const name of fs.readdirSync(CUSTOM_ROOT)) {
      if (fs.existsSync(path.join(CUSTOM_ROOT, name, 'SKILL.md'))) {
        custom.push(`custom/${name}`);
      }
    }
  }
  return [...gingiris, ...custom.sort()];
}
