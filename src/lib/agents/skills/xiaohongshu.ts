import type { ChannelSkill } from './types';

export const xiaohongshuSkill: ChannelSkill = {
  channelId: 'xiaohongshu',
  skillId: 'xiaohongshu-gtm',
  name: '小红书',
  nameEn: 'Xiaohongshu',
  description: '公域种草 + 故事化内容，适合工具/课程/咨询类 side project 冷启动',
  locales: ['zh'],
  tier: 'mvp',
  postsPerWeek: 3,
  campaignDays: 30,
  defaultTaskTypes: ['post', 'story', 'engage'],
  methodology: `小红书获客核心：真实故事 > 硬广，人设 > 产品。

四周叙事弧线：
- W1 人设与信任：起源故事（我为什么做这个）、真实挫折、身份共鸣（如"大厂程序员的 side project"）
- W2 价值展示：痛点场景拆解、干货教程（产品自然出场）、before/after 对比
- W3 转化推动：用户故事/使用截图、评论区互动引导私信、限定内测邀请
- W4 复盘放大：30 天数据复盘帖（真实数字最带流量）、用户证言合集

内容结构公式：钩子标题（情绪词+数字）→ 痛点共鸣开头 → 个人经历/干货主体 → 产品软性出场 → 互动式 CTA。
爆款要素：真实感（截图、对话记录）、身份标签、争议或反差（"被同事泼冷水"）。
流量逻辑：前 2 小时互动决定推荐量，发布后 1 小时内必须回复所有评论。`,
  reference: `格式约束：
- 标题 ≤ 20 字，含情绪词或数字，emoji 可选
- 正文 300-800 字，每段 ≤ 3 行，多分段
- 结尾互动式 CTA：「评论区聊聊你的看法」「想要链接的扣 1」
- 话题标签 3-6 个：1 个大流量 + 2-3 个精准垂类
- 禁用硬广词：秒杀、限时、必买、全网最`,
  playbook: {
    credibility: '源自多个 0 粉丝账号 30 天冷启动至首批付费用户的实战复盘',
    principles: [
      '人设先于产品：用户先信任「你」，才会看「它」',
      '真实故事是最强钩子：挫折与反差比成功学更带流量',
      '前 2 小时互动决定推荐量：发布后 1 小时内回复所有评论',
      '软 CTA 优于硬广：评论区互动引导私信，转化在私域完成',
    ],
    expectation: '每周 3 帖节奏下，第 1-2 周看互动信号（评论/收藏），第 3 周起出现私信咨询属正常曲线',
  },
  templates: [
    { id: 'origin-story', taskType: 'post', name: '起源故事帖', description: '我为什么做这个产品' },
    { id: 'pain-point', taskType: 'post', name: '痛点共鸣帖', description: '目标用户的真实困境' },
    { id: 'how-to', taskType: 'post', name: '干货教程帖', description: '分享一个实用技巧' },
    { id: 'engage', taskType: 'engage', name: '互动回复', description: '回复评论和私信' },
  ],
};
