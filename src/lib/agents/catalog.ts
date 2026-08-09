/**
 * 渠道与 Skill 目录 — 供各 Agent 使用。
 *
 * Skill 使用方式（按用户设计）：
 * - 市场推荐：固定载入已审核的推荐 Skill
 * - 市场总监：只从已审核运行时目录渐进式召回
 * - 渠道专员：固定载入公共契约与对应渠道 Skill
 */

import fs from 'fs';
import path from 'path';
import {
  CHANNEL_DEFINITIONS,
  CHANNEL_RECOMMENDER_SKILL_IDS,
  getChannelDefinition,
  getChannelPlanningSkillIds,
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

let runtimeCatalogCache: SkillCatalogEntry[] | null = null;

/** 仅包含当前生产映射中审核通过的 Skill，供 Director 等运行时路由使用。 */
export function getRuntimeSkillCatalog(): SkillCatalogEntry[] {
  if (runtimeCatalogCache) return runtimeCatalogCache;
  const skillIds = [
    ...new Set([
      ...CHANNEL_RECOMMENDER_SKILL_IDS,
      ...CHANNEL_DEFINITIONS.flatMap((definition) =>
        getResolvedChannelSkillIds(definition)
      ),
    ]),
  ];
  runtimeCatalogCache = skillIds.map((skillId) => {
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
  return runtimeCatalogCache;
}

export function formatRuntimeSkillCatalog(): string {
  return formatSkillCatalog(getRuntimeSkillCatalog());
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

/** 拒绝加载未进入审核运行时映射的 vendor Skill。 */
export function loadRuntimeSkillContents(skillIds: string[]): string {
  const allowed = new Set(getRuntimeSkillCatalog().map((entry) => entry.skillId));
  return loadSkillContents(skillIds.filter((skillId) => allowed.has(skillId)));
}

/** 渠道专员全程佩戴的 skill 全文（嵌入 System Prompt） */
export function getChannelSkillForPrompt(
  channelId: string,
  purpose: 'planning' | 'writing' = 'writing'
): string {
  const def = getChannelDefinition(channelId);
  if (!def) return '';
  try {
    const skillIds =
      purpose === 'planning'
        ? getChannelPlanningSkillIds(def)
        : getResolvedChannelSkillIds(def);
    return getCombinedSkillContent(skillIds).slice(
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
  locales: string[];
  postsPerWeek: number;
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
    locales: d.locales,
    postsPerWeek: d.postsPerWeek,
    skillIds: getChannelPlanningSkillIds(d),
  }));
}

export function formatChannelCatalog(entries?: ChannelCatalogEntry[]): string {
  return (entries ?? getChannelCatalog())
    .map(
      (c) =>
        `- ${c.channelId}（${c.name}）[${c.medium}/${c.outputMode}; locales=${c.locales.join('/')}; ~${c.postsPerWeek}/week]: ${c.description}；交付：${c.deliverables.join('、')}`
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
