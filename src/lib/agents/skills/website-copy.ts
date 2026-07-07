import type { ChannelSkill } from './types';

export const websiteCopySkill: ChannelSkill = {
  channelId: 'website_copy',
  skillId: 'website-copy-gtm',
  name: '落地页优化',
  nameEn: 'Website Copy',
  description: 'Day1 落地页转化优化：所有渠道流量的最终承接点',
  locales: ['zh', 'en'],
  tier: 'mvp',
  postsPerWeek: 1,
  campaignDays: 30,
  defaultTaskTypes: ['prep', 'optimize'],
  methodology: `落地页是所有渠道流量的转化枢纽，Day1 必须优先优化，否则内容引流全部浪费。

3 秒转化法则：访客 3 秒内必须知道「这是什么」「对我有什么用」「下一步做什么」。

Hero 区公式：
- 标题 = 用户痛点的镜像（不是产品功能描述）："合同审查太慢？" > "AI 合同审查工具"
- 副标题 = 具体价值 + 差异化（一句话）
- CTA = 动作 + 低门槛："免费试用 3 份合同" > "立即注册"

信任要素排序：真实用户证言 > 数据（用户数/处理量）> 团队背景 > 媒体背书。
第一屏之外：痛点场景 → 解决方案演示（截图/GIF）→ 社会证明 → FAQ → 二次 CTA。`,
  reference: `格式约束：
- Hero 标题 ≤ 12 字（中文）/ ≤ 8 词（英文），痛点导向
- 副标题 1-2 句，含差异化
- CTA 按钮动作导向且低门槛
- 每屏只说一件事`,
  playbook: {
    credibility: '基于 3 秒转化法则与 60K+ star 开源项目首页文案的实战框架',
    principles: [
      '标题写痛点，不写功能：用户搜索的是问题，不是方案',
      '3 秒法则：是什么/对我有什么用/下一步做什么',
      'CTA 低门槛化："免费试 3 次" 永远好于 "立即注册"',
      '先修落地页再引流：否则内容流量全部漏掉',
    ],
    expectation: 'Hero 优化通常在 Day1-2 完成；之后每周根据渠道反馈微调一次文案',
  },
  templates: [
    { id: 'hero-rewrite', taskType: 'prep', name: 'Hero 改写', description: '优化首屏标题和副标题' },
    { id: 'cta-optimize', taskType: 'optimize', name: 'CTA 优化', description: '优化行动号召文案' },
  ],
};
