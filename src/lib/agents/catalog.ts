/**
 * 渠道与 Skill 目录 — 供各 Agent 使用。
 *
 * Skill 使用方式（按用户设计）：
 * - 市场总监 / 策略生成 Agent：渐进式载入（先看目录，需要时再召回全文）
 * - 渠道专员：Skill 全文作为 System Prompt 变量直接嵌入（全程佩戴）
 */

import fs from 'fs';
import path from 'path';
import {
  CHANNEL_DEFINITIONS,
  getChannelDefinition,
  getResolvedChannelSkillIds,
} from './skills/channel-map';
import { getCombinedSkillContent, getSkillMeta, listAllSkillIds } from './skills/loader';

/** 单个 skill 注入的最大字符数（含 references），避免撑爆上下文 */
const MAX_SKILL_CHARS = 20000;

export interface SkillCatalogEntry {
  skillId: string;
  name: string;
  description: string;
}

let catalogCache: SkillCatalogEntry[] | null = null;

/** 全量 skill 目录（id + 一句话描述），用于渐进式载入的第一阶段 */
export function getSkillCatalog(): SkillCatalogEntry[] {
  if (catalogCache) return catalogCache;
  catalogCache = listAllSkillIds().map((skillId) => {
    try {
      const meta = getSkillMeta(skillId);
      return {
        skillId,
        name: meta.name ?? skillId,
        description: (meta.description ?? '').split('\n')[0].slice(0, 160),
      };
    } catch {
      return { skillId, name: skillId, description: '' };
    }
  });
  return catalogCache;
}

export function formatSkillCatalog(entries?: SkillCatalogEntry[]): string {
  const list = entries ?? getSkillCatalog();
  return list
    .map((e) => `- ${e.skillId}: ${e.description || e.name}`)
    .join('\n');
}

/** 按需召回若干 skill 的全文（渐进式载入第二阶段） */
export function loadSkillContents(skillIds: string[]): string {
  const valid = skillIds.filter((id) => {
    try {
      getSkillMeta(id);
      return true;
    } catch {
      return false;
    }
  });
  if (valid.length === 0) return '';
  return valid
    .map((id) => {
      const content = getCombinedSkillContent([id]);
      return `<skill id="${id}">\n${content.slice(0, MAX_SKILL_CHARS)}\n</skill>`;
    })
    .join('\n\n');
}

/** 渠道专员全程佩戴的 skill 全文（嵌入 System Prompt） */
export function getChannelSkillForPrompt(channelId: string): string {
  const def = getChannelDefinition(channelId);
  if (!def) return '';
  try {
    return getCombinedSkillContent(getResolvedChannelSkillIds(def)).slice(
      0,
      MAX_SKILL_CHARS * 2
    );
  } catch {
    return '';
  }
}

export interface ChannelCatalogEntry {
  channelId: string;
  name: string;
  nameEn: string;
  description: string;
  medium: (typeof CHANNEL_DEFINITIONS)[number]['medium'];
  outputMode: (typeof CHANNEL_DEFINITIONS)[number]['outputMode'];
  deliverables: string[];
  skillIds: string[];
}

export function getChannelCatalog(): ChannelCatalogEntry[] {
  return CHANNEL_DEFINITIONS.map((d) => ({
    channelId: d.channelId,
    name: d.name,
    nameEn: d.nameEn,
    description: d.description,
    medium: d.medium,
    outputMode: d.outputMode,
    deliverables: d.deliverables,
    skillIds: getResolvedChannelSkillIds(d),
  }));
}

export function formatChannelCatalog(entries?: ChannelCatalogEntry[]): string {
  return (entries ?? getChannelCatalog())
    .map(
      (c) =>
        `- ${c.channelId}（${c.name}）[${c.medium}/${c.outputMode}]: ${c.description}；交付：${c.deliverables.join('、')}`
    )
    .join('\n');
}

export function channelName(channelId: string, locale = 'zh'): string {
  const def = getChannelDefinition(channelId);
  if (!def) return channelId;
  return locale === 'en' ? def.nameEn : def.name;
}

/** vendor 目录缺失时（如精简部署）也不至于崩溃 */
export function vendorAvailable(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'vendor'));
}
