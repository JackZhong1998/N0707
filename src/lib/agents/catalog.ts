/**
 * 渠道与 Skill 目录 — 供各 Agent 使用。
 *
 * Skill 使用方式（按用户设计）：
 * - 市场总监 / 策略生成 Agent：渐进式载入（先看目录，需要时再召回全文）
 * - 渠道专员：Skill 全文作为 System Prompt 变量直接嵌入（全程佩戴）
 */

import fs from 'fs';
import path from 'path';
import type { OptionCard } from '@/lib/gtm/types';
import { CHANNEL_DEFINITIONS, getChannelDefinition } from './skills/channel-map';
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
    return getCombinedSkillContent(def.skillIds).slice(0, MAX_SKILL_CHARS * 2);
  } catch {
    return '';
  }
}

export interface ChannelCatalogEntry {
  channelId: string;
  name: string;
  nameEn: string;
  description: string;
  skillIds: string[];
}

export function getChannelCatalog(): ChannelCatalogEntry[] {
  return CHANNEL_DEFINITIONS.map((d) => ({
    channelId: d.channelId,
    name: d.name,
    nameEn: d.nameEn,
    description: d.description,
    skillIds: d.skillIds,
  }));
}

export function formatChannelCatalog(): string {
  return getChannelCatalog()
    .map((c) => `- ${c.channelId}（${c.name}）: ${c.description}`)
    .join('\n');
}

export interface ChannelRecommendationInput {
  /** kickoff market 选项 id：cn / us / sea / global */
  markets?: string[];
  /** kickoff stage 选项 id：idea / building / live / users */
  stage?: string;
  /** kickoff time 选项 id：lt30 / m30h1 / h12 / h3 */
  time?: string;
  locale?: string;
}

/** 根据冷启动问卷上下文推荐最适合的 3–4 个渠道（供 mock 与总监参考） */
export function recommendChannels(input: ChannelRecommendationInput = {}): string[] {
  const markets = input.markets?.length ? input.markets : ['cn'];
  const stage = input.stage ?? 'live';
  const cnPrimary = markets.includes('cn') && !markets.includes('us');
  const enPrimary = markets.includes('us') || markets.includes('global');

  if (stage === 'idea' || stage === 'building') {
    if (enPrimary) {
      return ['user_interview', 'twitter_x', 'user_outreach', 'website_copy'];
    }
    return ['user_interview', 'xiaohongshu', 'user_outreach', 'website_copy'];
  }

  if (enPrimary) {
    const channels = ['twitter_x', 'user_outreach', 'website_copy'];
    if (stage === 'live' || stage === 'users') {
      channels.push('product_hunt');
    }
    return [...new Set(channels)];
  }

  if (cnPrimary || markets.includes('sea')) {
    return stage === 'users'
      ? ['xiaohongshu', 'user_outreach', 'wechat_official', 'website_copy']
      : ['xiaohongshu', 'user_outreach', 'website_copy', 'wechat_official'];
  }

  return ['xiaohongshu', 'user_outreach', 'twitter_x', 'website_copy'];
}

export function buildChannelPickOptionCard(
  channelIds: string[],
  locale = 'zh'
): Pick<OptionCard, 'question' | 'multi' | 'allowCustom' | 'options' | 'recommendedChannelIds'> {
  const isZh = locale !== 'en';
  return {
    question: isZh
      ? '你想先从哪几个渠道做起？（可多选，我们会帮你省时间）'
      : 'Which channels do you want to start with? (pick any — we handle the heavy lifting)',
    multi: true,
    allowCustom: true,
    recommendedChannelIds: channelIds,
    options: channelIds.map((channelId) => {
      const def = getChannelDefinition(channelId);
      return {
        id: channelId,
        label: channelName(channelId, locale),
        ...(def?.description ? { description: def.description } : {}),
      };
    }),
  };
}

export function formatChannelRecommendationBrief(
  channelIds: string[],
  locale = 'zh'
): string {
  const isZh = locale !== 'en';
  return channelIds
    .map((channelId, index) => {
      const def = getChannelDefinition(channelId);
      const name = channelName(channelId, locale);
      const desc = def?.description ?? '';
      return isZh
        ? `${index + 1}. **${name}** — ${desc}`
        : `${index + 1}. **${name}** — ${desc}`;
    })
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
