/**
 * 对话冷启动固定问卷。
 * 这些是每个用户都要回答的标准化问题 — 不劳烦 LLM 提问，
 * 用户一进入对话就以「多题选择卡」的形式展示，30 秒答完。
 */

import type { KickoffCard } from './types';

export function buildKickoffCard(isZh: boolean): KickoffCard {
  if (!isZh) {
    return {
      title: 'Quick setup — 30 seconds, so every suggestion fits you',
      questions: [
        {
          id: 'market',
          question: 'Which market are you going after?',
          multi: true,
          options: [
            { id: 'cn', label: 'China (Chinese content)' },
            { id: 'us', label: 'US / English market (English content)' },
            { id: 'sea', label: 'Southeast Asia' },
            { id: 'global', label: 'Global — try everything' },
          ],
        },
        {
          id: 'stage',
          question: 'Where is your product right now?',
          multi: false,
          options: [
            { id: 'idea', label: 'Idea / planning' },
            { id: 'building', label: 'In development (demo ready)' },
            { id: 'live', label: 'Live and usable' },
            { id: 'users', label: 'Live with some users' },
          ],
        },
        {
          id: 'team',
          question: 'Who is doing this with you?',
          multi: false,
          options: [
            { id: 'solo', label: 'Just me' },
            { id: 'duo', label: '2–3 person team' },
            { id: 'parttime', label: 'Me + part-time helpers' },
          ],
        },
        {
          id: 'time',
          question: 'How much time per day can you spend on getting users?',
          multi: false,
          options: [
            { id: 'lt1', label: 'Under 1 hour' },
            { id: 'h12', label: '1–2 hours' },
            { id: 'h3', label: '3+ hours' },
          ],
        },
      ],
    };
  }
  return {
    title: '快速摸底 — 30 秒答完，后面的建议才会准',
    questions: [
      {
        id: 'market',
        question: '你要做的目标市场是？',
        multi: true,
        options: [
          { id: 'cn', label: '中国市场（中文内容）' },
          { id: 'us', label: '美国 / 英语市场（英文内容）' },
          { id: 'sea', label: '东南亚市场' },
          { id: 'global', label: '全球都想试试' },
        ],
      },
      {
        id: 'stage',
        question: '你的产品现在处于什么状态？',
        multi: false,
        options: [
          { id: 'idea', label: '想法 / 规划中' },
          { id: 'building', label: '开发中（有 Demo）' },
          { id: 'live', label: '已上线可用' },
          { id: 'users', label: '已上线且有一些用户' },
        ],
      },
      {
        id: 'team',
        question: '团队情况是？',
        multi: false,
        options: [
          { id: 'solo', label: '就我一个人' },
          { id: 'duo', label: '2–3 人小团队' },
          { id: 'parttime', label: '我 + 兼职伙伴' },
        ],
      },
      {
        id: 'time',
        question: '每天能投入多少时间做获客？',
        multi: false,
        options: [
          { id: 'lt1', label: '1 小时以内' },
          { id: 'h12', label: '1–2 小时' },
          { id: 'h3', label: '3 小时以上' },
        ],
      },
    ],
  };
}

/** 把问卷答案拼成一条发给市场总监的消息 */
export function formatKickoffAnswers(
  card: KickoffCard,
  answers: Record<string, string[]>,
  isZh: boolean
): string {
  const lines = card.questions
    .map((q) => {
      const picked = answers[q.id] ?? [];
      if (picked.length === 0) return null;
      return `${q.question} ${picked.join(isZh ? '、' : ', ')}`;
    })
    .filter(Boolean);
  return `${isZh ? '我的基本情况：' : 'My basics:'}\n${lines.map((l) => `- ${l}`).join('\n')}`;
}
