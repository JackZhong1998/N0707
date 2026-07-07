import type { ChannelSkill } from './types';

export const userOutreachSkill: ChannelSkill = {
  channelId: 'user_outreach',
  skillId: 'user-outreach-gtm',
  name: '私域 / 朋友圈',
  nameEn: 'Private Outreach',
  description: '朋友圈信任建设 + 精准私信触达，转化路径最短的渠道',
  locales: ['zh', 'en'],
  tier: 'mvp',
  postsPerWeek: 2,
  campaignDays: 30,
  defaultTaskTypes: ['moments', 'dm', 'followup'],
  methodology: `私域获客核心：信任前置，触达精准，绝不群发。

KOL/用户触达流水线（发现 → 触达 → 跟进 → 转化）：
1. 名单构建：每周锁定 3-5 个精准潜在用户（朋友圈熟人 → 二度人脉 → 社群成员）
2. 私信公式：具体问候（为什么想到 TA）→ 一个真诚的问题 → 轻量邀请（"方便的话给你看个东西"），全程不推销
3. 跟进节奏：48 小时无回复 → 一次轻量跟进；再无回复 → 归档，两周后换角度
4. 朋友圈策略：进展叙事（不是广告位），展示过程、数据、思考，让熟人主动来问

转化路径：朋友圈建立心智 → 私信深聊 → demo/试用 → 成交或深度反馈。`,
  reference: `格式约束：
- 朋友圈 100-200 字，口语化，像跟朋友分享；配图用真实截图
- 私信 ≤ 100 字：问候（个性化）+ 为什么想到TA + 一个具体问题 + 轻量邀请
- 禁止群发模板痕迹；每条私信必须有专属定制部分
- 跟进消息更短（≤ 50 字），给对方台阶`,
  playbook: {
    credibility: '基于经过验证的 KOL 触达与冷启动私域方法论（回复率优化框架）',
    principles: [
      '10 个精准触达 > 1000 次群发：回复率是唯一重要指标',
      '私信不推销：先给价值或提真问题，让对方产生好奇',
      '朋友圈是进展叙事：展示过程与思考，让人主动来问',
      '48 小时跟进一次，最多两次：保持体面，留下好感',
    ],
    expectation: '个性化私信正常回复率 30-50%；每周 3-5 个精准触达，第 2 周起应出现深聊或试用',
  },
  templates: [
    { id: 'moments-update', taskType: 'moments', name: '朋友圈进展', description: '分享产品进展或思考' },
    { id: 'dm-outreach', taskType: 'dm', name: '私信触达', description: '给潜在用户发个性化私信' },
    { id: 'followup', taskType: 'followup', name: '跟进回复', description: '跟进之前的对话' },
  ],
};
