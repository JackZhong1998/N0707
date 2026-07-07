import type { ChannelSkill, SkillPlaybook } from './types';
import { xiaohongshuSkill } from './xiaohongshu';
import { userOutreachSkill } from './user-outreach';
import { websiteCopySkill } from './website-copy';
import { wechatOfficialSkill } from './wechat-official';
import { userInterviewSkill } from './user-interview';

const productHuntSkill: ChannelSkill = {
  channelId: 'product_hunt',
  skillId: 'product-hunt-gtm',
  name: 'Product Hunt',
  nameEn: 'Product Hunt',
  description: '海外产品发布集中曝光节点，冲榜有完整 SOP',
  locales: ['en'],
  tier: 'p1',
  postsPerWeek: 1,
  campaignDays: 30,
  defaultTaskTypes: ['launch', 'prep', 'engage'],
  methodology: `PH 冲榜核心：launch 是一天，准备是两周。
准备期：maker 故事打磨、首图/GIF 资产、hunter 联络、支持者名单预热（50+ 人）。
Launch 日 SOP：太平洋时间 00:01 上线，首小时动员核心支持者，全天每 2 小时回复所有评论，maker comment 讲故事不是功能列表。
排名逻辑：评论质量与互动率权重高于纯 upvote 数。`,
  reference: 'Tagline ≤ 60 字符；描述用 bullet 结构；maker comment 讲个人故事。',
  playbook: {
    credibility: '源自 30+ 次日榜第一发布的完整 SOP（含 Manus、Devin 级案例框架）',
    principles: [
      'Launch 是一天，准备是两周：支持者名单预热到 50+',
      '评论质量 > upvote 数量：全天每 2 小时回复所有评论',
      'Maker comment 讲故事不列功能',
    ],
    expectation: '准备 2 周 + launch 1 天 + 后续 1 周长尾；日榜前 5 通常带来 1-3K 精准访问',
  },
  templates: [
    { id: 'ph-launch', taskType: 'launch', name: 'PH Launch', description: 'Launch day post and comments' },
  ],
};

const twitterXSkill: ChannelSkill = {
  channelId: 'twitter_x',
  skillId: 'twitter-x-gtm',
  name: 'Twitter / X',
  nameEn: 'Twitter / X',
  description: 'Build in public，海外 builder 社区主阵地',
  locales: ['en'],
  tier: 'p1',
  postsPerWeek: 3,
  campaignDays: 30,
  defaultTaskTypes: ['thread', 'post', 'engage'],
  methodology: `Build in public 运营框架：人设校准 → 事实素材库（真实数字，绝不编造）→ 每周排期 → 发布后互动。
内容支柱：进展更新（带真实数据）、踩坑复盘、干货 thread、与大 V 的高质量回复互动。
Thread 公式：钩子推文（数字/反差）→ 3-7 条正文 → 总结 + 软 CTA。`,
  reference: 'Thread：钩子 + 3-7 tweets，每条 ≤ 280 字符；真实数字，不编造。',
  playbook: {
    credibility: '源自 45 天 +60% 粉丝增长的 agent 运营 SOP（每日 1 帖，全程可复制）',
    principles: [
      '真实数字是唯一素材：绝不编造数据',
      '高质量回复大 V > 自说自话：借流量池冷启动',
      'Thread 钩子决定 90% 的传播：数字与反差优先',
    ],
    expectation: '每周 3 帖 + 每日 15 分钟互动，第 2-3 周出现稳定互动与 DM',
  },
  templates: [
    { id: 'thread', taskType: 'thread', name: 'Thread', description: 'Multi-tweet story' },
    { id: 'single', taskType: 'post', name: 'Single Tweet', description: 'Quick update' },
  ],
};

const linkedinSkill: ChannelSkill = {
  channelId: 'linkedin',
  skillId: 'linkedin-gtm',
  name: 'LinkedIn',
  nameEn: 'LinkedIn',
  description: 'B2B 专业内容与决策者触达',
  locales: ['en', 'zh'],
  tier: 'p2',
  postsPerWeek: 2,
  campaignDays: 30,
  defaultTaskTypes: ['post', 'engage'],
  methodology: 'B2B 专业叙事：行业洞察 + 个人职业故事 + 产品案例。前 2 行决定展开率。',
  reference: '前 2 行是钩子；多用换行；专业但有人味。',
  playbook: {
    credibility: '基于 B2B SaaS 从 0 到 $1M ARR 的内容管线框架',
    principles: ['前 2 行决定展开率', '决策者看结果，不看功能', '评论区互动权重高'],
    expectation: '每周 2 帖，B2B 转化周期长，4 周内以建立专业心智为主',
  },
  templates: [
    { id: 'story-post', taskType: 'post', name: 'Story Post', description: 'Professional narrative' },
  ],
};

const ALL_SKILLS: ChannelSkill[] = [
  xiaohongshuSkill,
  userOutreachSkill,
  websiteCopySkill,
  wechatOfficialSkill,
  userInterviewSkill,
  productHuntSkill,
  twitterXSkill,
  linkedinSkill,
];

const skillMap = new Map(ALL_SKILLS.map((s) => [s.channelId, s]));

export function loadSkill(channelId: string): ChannelSkill | undefined {
  return skillMap.get(channelId);
}

export function getSkillRegistryMeta(): Array<{
  channelId: string;
  skillId: string;
  name: string;
  description: string;
  tier: string;
  locales: string[];
}> {
  return ALL_SKILLS.map((s) => ({
    channelId: s.channelId,
    skillId: s.skillId,
    name: s.name,
    description: s.description,
    tier: s.tier,
    locales: s.locales,
  }));
}

/** 客户端安全的 playbook 展示数据（不含完整 prompt 方法论） */
export interface PlaybookDisplay {
  channelId: string;
  name: string;
  nameEn: string;
  description: string;
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
    playbook: s.playbook,
    postsPerWeek: s.postsPerWeek,
  };
}

export function getAllPlaybookDisplays(): PlaybookDisplay[] {
  return ALL_SKILLS.map((s) => getPlaybookDisplay(s.channelId)!) ;
}

export function channelSkillId(channelId: string): string {
  return skillMap.get(channelId)?.skillId ?? channelId;
}

export function getChannelName(channelId: string, locale = 'zh'): string {
  const skill = skillMap.get(channelId);
  if (!skill) return channelId;
  return locale === 'en' ? skill.nameEn : skill.name;
}

export const MVP_CN_CHANNELS = ['xiaohongshu', 'user_outreach', 'website_copy'] as const;
