/**
 * 渠道 → Gingiris Skill 映射
 * skillIds 数组按优先级排列，Agent 注入时会合并全部 SKILL.md 原文
 */
export interface ChannelDefinition {
  channelId: string;
  skillIds: string[];
  name: string;
  nameEn: string;
  description: string;
  locales: string[];
  tier: 'mvp' | 'p1' | 'p2' | 'extended' | 'phase0';
  postsPerWeek: number;
  campaignDays: number;
  defaultTaskTypes: string[];
}

export const CHANNEL_DEFINITIONS: ChannelDefinition[] = [
  {
    channelId: 'xiaohongshu',
    skillIds: ['custom/xiaohongshu'],
    name: '小红书',
    nameEn: 'Xiaohongshu',
    description: '公域种草 + 故事化内容，适合工具/课程/咨询类 side project 冷启动',
    locales: ['zh'],
    tier: 'mvp',
    postsPerWeek: 3,
    campaignDays: 30,
    defaultTaskTypes: ['post', 'story', 'engage'],
  },
  {
    channelId: 'user_outreach',
    skillIds: ['gingiris-kol-outreach', 'kol-outreach'],
    name: '私域 / 朋友圈',
    nameEn: 'Private Outreach',
    description: '朋友圈信任建设 + 精准私信触达，转化路径最短的渠道',
    locales: ['zh', 'en'],
    tier: 'mvp',
    postsPerWeek: 2,
    campaignDays: 30,
    defaultTaskTypes: ['moments', 'dm', 'followup'],
  },
  {
    channelId: 'website_copy',
    skillIds: ['gr-readme'],
    name: '官网 / 落地页',
    nameEn: 'Website Copy',
    description: 'Day1 落地页 Hero 优化，所有渠道流量的转化枢纽',
    locales: ['zh', 'en'],
    tier: 'mvp',
    postsPerWeek: 1,
    campaignDays: 30,
    defaultTaskTypes: ['prep', 'copy'],
  },
  {
    channelId: 'wechat_official',
    skillIds: ['custom/wechat-official'],
    name: '微信公众号',
    nameEn: 'WeChat Official',
    description: '长文深度内容，建立专业信任与搜索沉淀',
    locales: ['zh'],
    tier: 'p1',
    postsPerWeek: 1,
    campaignDays: 30,
    defaultTaskTypes: ['article', 'engage'],
  },
  {
    channelId: 'user_interview',
    skillIds: ['gingiris-user-interview'],
    name: '用户访谈',
    nameEn: 'User Interview',
    description: 'PMF 验证与用户发现，验证不足时的 Phase 0 核心',
    locales: ['zh', 'en'],
    tier: 'phase0',
    postsPerWeek: 2,
    campaignDays: 30,
    defaultTaskTypes: ['prep', 'interview', 'synthesis'],
  },
  {
    channelId: 'product_hunt',
    skillIds: ['product-hunt-playbook', 'gingiris-launch', 'product-hunt-launch-guide'],
    name: 'Product Hunt',
    nameEn: 'Product Hunt',
    description: '海外产品发布集中曝光节点，冲榜有完整 SOP',
    locales: ['en'],
    tier: 'p1',
    postsPerWeek: 1,
    campaignDays: 30,
    defaultTaskTypes: ['launch', 'prep', 'engage'],
  },
  {
    channelId: 'twitter_x',
    skillIds: ['gingiris-twitter-agent-ops'],
    name: 'Twitter / X',
    nameEn: 'Twitter / X',
    description: 'Build in public，海外 builder 社区主阵地',
    locales: ['en'],
    tier: 'p1',
    postsPerWeek: 3,
    campaignDays: 30,
    defaultTaskTypes: ['thread', 'post', 'engage'],
  },
  {
    channelId: 'linkedin',
    skillIds: ['b2b-marketing-playbook', 'gingiris-b2b-growth'],
    name: 'LinkedIn',
    nameEn: 'LinkedIn',
    description: 'B2B 专业内容与决策者触达',
    locales: ['en', 'zh'],
    tier: 'p2',
    postsPerWeek: 2,
    campaignDays: 30,
    defaultTaskTypes: ['post', 'engage'],
  },
  {
    channelId: 'reddit',
    skillIds: ['gingiris-reddit-marketing'],
    name: 'Reddit',
    nameEn: 'Reddit',
    description: 'Reddit 营销与 AI 引用优化',
    locales: ['en'],
    tier: 'p1',
    postsPerWeek: 2,
    campaignDays: 30,
    defaultTaskTypes: ['post', 'engage'],
  },
  {
    channelId: 'github_growth',
    skillIds: ['gingiris-opensource', 'github-stars-playbook'],
    name: 'GitHub 增长',
    nameEn: 'GitHub Growth',
    description: '开源项目 GitHub Stars 增长系统',
    locales: ['en'],
    tier: 'extended',
    postsPerWeek: 2,
    campaignDays: 30,
    defaultTaskTypes: ['post', 'prep', 'engage'],
  },
  {
    channelId: 'competitor_research',
    skillIds: ['competitor-research-playbook'],
    name: '竞品研究',
    nameEn: 'Competitor Research',
    description: '增长飞轮拆解与竞品传播链分析',
    locales: ['zh', 'en'],
    tier: 'phase0',
    postsPerWeek: 1,
    campaignDays: 30,
    defaultTaskTypes: ['prep', 'research'],
  },
];

export const CHANNEL_ROUTER_SKILL_IDS = ['gingiris-growth-finder', 'go-to-market-playbook'];

export const KICKOFF_SKILL_IDS = ['go-to-market-playbook', 'startup-launch-playbook'];

export function getChannelDefinition(channelId: string): ChannelDefinition | undefined {
  return CHANNEL_DEFINITIONS.find((c) => c.channelId === channelId);
}
