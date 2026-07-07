import type { ChannelSkill } from './types';

export const userInterviewSkill: ChannelSkill = {
  channelId: 'user_interview',
  skillId: 'user-interview-gtm',
  name: '用户访谈',
  nameEn: 'User Interview',
  description: 'Phase 0 验证：用 JTBD 框架跑 5 场访谈，再决定推什么',
  locales: ['zh', 'en'],
  tier: 'phase0',
  postsPerWeek: 2,
  campaignDays: 14,
  defaultTaskTypes: ['research', 'interview', 'synthesis'],
  methodology: `验证不足时，访谈优先于推广——方向错了，执行越猛浪费越大。

JTBD（Jobs-to-be-Done）访谈框架：
- 目标：5 场 × 15-20 分钟，验证三件事：痛点是否真实高频、现有解法是什么、付费意愿边界
- 招募：从朋友圈/社群找符合 ICP 的人，给小回报（请咖啡/送内测资格）
- 提纲原则：问过去的真实行为（"上次遇到 X 你怎么解决的"），不问假设性意见（"你会用吗"）
- 关键问题：最近一次遇到这个问题是什么时候？当时怎么解决的？花了多少时间/钱？如果有工具帮你解决，你期望它做到什么程度？

每场访谈后 24 小时内写 3 条关键洞察；5 场后做汇总：痛点热度排序 + 用户原话素材库（直接用于后续内容创作）。`,
  reference: `格式约束：
- 招募文案 ≤ 100 字：说明目的、时长、回报
- 访谈提纲 5-8 个开放问题，全部指向过去行为
- 洞察记录格式：用户原话 + 你的判断 + 对策略的影响`,
  playbook: {
    credibility: '基于 900+ 场用户访谈提炼的 JTBD 验证框架',
    principles: [
      '问行为不问意见："上次你怎么解决的" > "你会不会用"',
      '5 场高质量访谈足以验证方向：追求深度不是数量',
      '用户原话是内容金矿：访谈记录直接变成后续文案素材',
      '访谈先于推广：方向错误时，执行越猛浪费越大',
    ],
    expectation: '2 周内完成 5 场访谈 + 汇总；产出痛点排序和用户原话素材库，直接反哺内容策略',
  },
  templates: [
    { id: 'recruit', taskType: 'research', name: '招募受访者', description: '写招募文案找 5 个目标用户' },
    { id: 'interview-guide', taskType: 'interview', name: '访谈提纲', description: '准备 JTBD 问题清单' },
    { id: 'synthesis', taskType: 'synthesis', name: '洞察汇总', description: '汇总访谈发现' },
  ],
};
