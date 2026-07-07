import type { ChannelSkill } from './types';

export const wechatOfficialSkill: ChannelSkill = {
  channelId: 'wechat_official',
  skillId: 'wechat-official-gtm',
  name: '微信公众号',
  nameEn: 'WeChat Official',
  description: '长文深度内容，建立专业信任与搜索沉淀',
  locales: ['zh'],
  tier: 'p1',
  postsPerWeek: 1,
  campaignDays: 30,
  defaultTaskTypes: ['article', 'engage'],
  methodology: `公众号定位：深度信任资产 + 微信生态搜索沉淀，节奏慢但复利强。

每周 1 篇长文，结构：真实问题引入（前 3 段留人）→ 深度分析/方法论 → 案例或数据佐证 → 产品自然植入（解决方案之一，不是唯一）→ 关注/私信引导。

选题策略：垂类痛点长尾词（用户会搜的问题）> 行业热点跟进 > 个人复盘故事。
与其他渠道联动：小红书/朋友圈引流 → 公众号深度内容承接 → 私信转化。`,
  reference: `格式约束：
- 标题 15-25 字，信息量 + 好奇缺口
- 开头 3 段必须抓住读者（场景/冲突/数字）
- 小标题分段，每段 ≤ 200 字
- 正文 1500-3000 字
- 结尾引导关注或私信，不硬推销`,
  playbook: {
    credibility: '基于内容 SEO 与深度信任建设的长文运营框架',
    principles: [
      '一篇深度长文 = 一个长期搜索入口：选题即关键词',
      '前 3 段决定完读率：场景、冲突、数字三选一开头',
      '产品是"方案之一"而非"唯一答案"：克制植入更可信',
      '与短内容渠道联动：短内容引流，长文承接信任',
    ],
    expectation: '每周 1 篇，公众号见效慢（4-8 周），但内容可长期复用为私域素材',
  },
  templates: [
    { id: 'deep-article', taskType: 'article', name: '深度长文', description: '行业洞察 + 产品价值' },
    { id: 'case-study', taskType: 'article', name: '案例分享', description: '用户故事或自身经历' },
  ],
};
