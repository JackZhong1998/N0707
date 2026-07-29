import fs from 'fs';
import path from 'path';
import type { ChannelSkill, GingirisSkillMeta, SkillPlaybook } from './types';
import {
  CHANNEL_DEFINITIONS,
  CHANNEL_ROUTER_SKILL_IDS,
  KICKOFF_SKILL_IDS,
  getChannelDefinition,
  getResolvedChannelSkillIds,
} from './channel-map';
import {
  getCombinedSkillContent,
  getSkillFullContent,
  getSkillMeta,
  listGingirisSkillIds,
  parseSkillFrontmatter,
} from './loader';

function buildPlaybookFromContent(fullContent: string, skillId: string): SkillPlaybook {
  const fm = parseSkillFrontmatter(fullContent);
  const desc = fm.description ?? skillId;

  const principles: string[] = [];
  const bulletMatches = fullContent.match(/^[-*•]\s+(.+)$/gm);
  if (bulletMatches) {
    for (const line of bulletMatches.slice(0, 5)) {
      const text = line.replace(/^[-*•]\s+/, '').trim();
      if (text.length > 10 && text.length < 120) principles.push(text);
    }
  }

  return {
    credibility: desc.split('\n')[0].slice(0, 200),
    principles: principles.length > 0 ? principles : [desc.split('\n')[0].slice(0, 100)],
    expectation: desc.split('\n').slice(1).join(' ').slice(0, 200) || '按 Playbook 原文执行',
  };
}

function buildChannelSkill(def: (typeof CHANNEL_DEFINITIONS)[number]): ChannelSkill {
  const resolvedSkillIds = getResolvedChannelSkillIds(def);
  const fullContent = getCombinedSkillContent(resolvedSkillIds);

  return {
    channelId: def.channelId,
    skillId: def.skillIds[0],
    skillIds: resolvedSkillIds,
    name: def.name,
    nameEn: def.nameEn,
    description: def.description,
    medium: def.medium,
    outputMode: def.outputMode,
    deliverables: def.deliverables,
    locales: def.locales,
    tier: def.tier,
    postsPerWeek: def.postsPerWeek,
    campaignDays: def.campaignDays,
    defaultTaskTypes: def.defaultTaskTypes,
    fullContent,
    playbook: buildPlaybookFromContent(fullContent, def.skillIds[0]),
    templates: def.defaultTaskTypes.map((taskType) => ({
      id: `${def.channelId}-${taskType}`,
      taskType,
      name: taskType,
      description: `${def.name} · ${taskType}`,
    })),
  };
}

const ALL_SKILLS: ChannelSkill[] = CHANNEL_DEFINITIONS.map(buildChannelSkill);
const skillMap = new Map(ALL_SKILLS.map((s) => [s.channelId, s]));

export function loadSkill(channelId: string): ChannelSkill | undefined {
  return skillMap.get(channelId);
}

export function getSkillRegistryMeta(): Array<{
  channelId: string;
  skillId: string;
  skillIds: string[];
  name: string;
  description: string;
  tier: string;
  locales: string[];
}> {
  return ALL_SKILLS.map((s) => ({
    channelId: s.channelId,
    skillId: s.skillId,
    skillIds: s.skillIds,
    name: s.name,
    description: s.description,
    tier: s.tier,
    locales: s.locales,
  }));
}

export function getAllGingirisSkills(): GingirisSkillMeta[] {
  let onWebsite = new Map<string, boolean>();
  try {
    const manifestPath = path.join(process.cwd(), 'vendor/gingiris-skills/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
      skills?: Array<{ skillId: string; onWebsite?: boolean }>;
    };
    onWebsite = new Map((manifest.skills ?? []).map((s) => [s.skillId, s.onWebsite ?? false]));
  } catch {
    // manifest optional
  }

  return listGingirisSkillIds().map((skillId) => {
    const meta = getSkillMeta(skillId);
    return {
      skillId,
      name: meta.name,
      description: meta.description?.split('\n')[0],
      onWebsite: onWebsite.get(skillId),
    };
  });
}

export function getRouterSkillContent(): string {
  return getCombinedSkillContent(CHANNEL_ROUTER_SKILL_IDS);
}

export function getKickoffSkillContent(): string {
  return getCombinedSkillContent(KICKOFF_SKILL_IDS);
}

export interface PlaybookDisplay {
  channelId: string;
  name: string;
  nameEn: string;
  description: string;
  medium: ChannelSkill['medium'];
  outputMode: ChannelSkill['outputMode'];
  deliverables: string[];
  skillIds: string[];
  playbook: SkillPlaybook;
  postsPerWeek: number;
}

export function getPlaybookDisplay(channelId: string): PlaybookDisplay | undefined {
  const s = skillMap.get(channelId);
  if (!s) return undefined;
  return {
    channelId: s.channelId,
    name: s.name,
    nameEn: s.nameEn,
    description: s.description,
    medium: s.medium,
    outputMode: s.outputMode,
    deliverables: s.deliverables,
    skillIds: s.skillIds,
    playbook: s.playbook,
    postsPerWeek: s.postsPerWeek,
  };
}

export function getAllPlaybookDisplays(): PlaybookDisplay[] {
  return ALL_SKILLS.map((s) => getPlaybookDisplay(s.channelId)!);
}

export function channelSkillId(channelId: string): string {
  return skillMap.get(channelId)?.skillId ?? channelId;
}

export function getChannelName(channelId: string, locale = 'zh'): string {
  const def = getChannelDefinition(channelId);
  if (!def) return channelId;
  return locale === 'en' ? def.nameEn : def.name;
}

export const MVP_CN_CHANNELS = ['xiaohongshu', 'user_outreach', 'website_copy'] as const;

export { getSkillFullContent, getCombinedSkillContent, listGingirisSkillIds };
