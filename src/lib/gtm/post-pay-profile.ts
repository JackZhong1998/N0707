/**
 * 付费后固定用户档案问卷（市场 / 渠道偏好 / 每天时间）。
 * 答案写入用户档案骨架；后续自由对话由 Context Agent 持续拓展同一份文档。
 */

import type { KickoffCard, OptionCard } from './types';

export const FIXED_DIRECTORY_CHANNEL_ID = 'directory';

export type TargetMarketLocale = 'zh' | 'en';

const MARKET_LABELS: Record<string, { zh: string; en: string }> = {
  na: { zh: '北美', en: 'North America' },
  eu: { zh: '欧洲', en: 'Europe' },
  sea: { zh: '东南亚', en: 'Southeast Asia' },
  cn: { zh: '中国', en: 'China' },
  jp: { zh: '日本', en: 'Japan' },
  kr: { zh: '韩国', en: 'Korea' },
};

export function buildPostPayProfileCard(isZh: boolean): KickoffCard {
  if (!isZh) {
    return {
      title: 'Quick profile — so channel picks fit you',
      questions: [
        {
          id: 'market',
          question: 'Which market are you going after?',
          multi: true,
          options: [
            { id: 'na', label: 'North America' },
            { id: 'eu', label: 'Europe' },
            { id: 'sea', label: 'Southeast Asia' },
            { id: 'cn', label: 'China' },
            { id: 'jp', label: 'Japan' },
            { id: 'kr', label: 'Korea' },
          ],
        },
        {
          id: 'channel_pref',
          question: 'Any channel preferences?',
          multi: true,
          options: [
            { id: 'unsure', label: 'Not sure — recommend for me' },
            { id: 'social', label: 'Social / community' },
            { id: 'seo', label: 'SEO / content' },
            { id: 'launch', label: 'Launch platforms (PH, HN…)' },
            { id: 'b2b', label: 'B2B / LinkedIn' },
            { id: 'china_social', label: 'China social (XHS, WeChat…)' },
          ],
        },
        {
          id: 'time',
          question: 'How much time per day for getting users?',
          multi: false,
          options: [
            { id: 'm30', label: 'About 30 minutes' },
            { id: 'h1', label: 'About 1 hour' },
            { id: 'h2', label: 'About 2 hours' },
          ],
        },
      ],
    };
  }
  return {
    title: '先补齐用户档案 — 后面渠道推荐才会准',
    questions: [
      {
        id: 'market',
        question: '你要做的目标市场是？',
        multi: true,
        options: [
          { id: 'na', label: '北美' },
          { id: 'eu', label: '欧洲' },
          { id: 'sea', label: '东南亚' },
          { id: 'cn', label: '中国' },
          { id: 'jp', label: '日本' },
          { id: 'kr', label: '韩国' },
        ],
      },
      {
        id: 'channel_pref',
        question: '有没有偏好的渠道？',
        multi: true,
        options: [
          { id: 'unsure', label: '不确定，让 AI 推荐' },
          { id: 'social', label: '社交 / 社区' },
          { id: 'seo', label: 'SEO / 内容' },
          { id: 'launch', label: '上线平台（PH、HN…）' },
          { id: 'b2b', label: 'B2B / LinkedIn' },
          { id: 'china_social', label: '国内社交（小红书、公众号…）' },
        ],
      },
      {
        id: 'time',
        question: '每天能投入多少时间做获客？',
        multi: false,
        options: [
          { id: 'm30', label: '约 30 分钟' },
          { id: 'h1', label: '约 1 小时' },
          { id: 'h2', label: '约 2 小时' },
        ],
      },
    ],
  };
}

export function resolveTargetMarketLocale(marketOptionIds: string[]): TargetMarketLocale {
  const markets = marketOptionIds.filter((id) => id in MARKET_LABELS);
  if (markets.length === 1 && markets[0] === 'cn') return 'zh';
  if (markets.includes('cn') && !markets.some((id) => id !== 'cn')) return 'zh';
  return 'en';
}

/** Seed / merge fixed fields into the expanding user profile markdown. */
export function formatPostPayProfileSeed(
  answers: Record<string, string[]>,
  isZh: boolean
): string {
  const labelFor = (questionId: string, optionId: string) => {
    const card = buildPostPayProfileCard(isZh);
    const q = card.questions.find((item) => item.id === questionId);
    return q?.options.find((o) => o.id === optionId)?.label ?? optionId;
  };
  const line = (questionId: string) => {
    const ids = answers[questionId] ?? [];
    if (ids.length === 0) return null;
    return ids.map((id) => labelFor(questionId, id)).join(isZh ? '、' : ', ');
  };
  const market = line('market');
  const channelPref = line('channel_pref');
  const time = line('time');
  if (isZh) {
    return [
      '## 固定档案（问卷）',
      market ? `- 目标市场：${market}` : null,
      channelPref ? `- 渠道偏好：${channelPref}` : null,
      time ? `- 每天投入时间：${time}` : null,
      '',
      '## 拓展偏好与想法',
      '（对话中提到的偏好、约束、人设与想法会持续补充在这里）',
    ]
      .filter((row) => row !== null)
      .join('\n');
  }
  return [
    '## Fixed profile (questionnaire)',
    market ? `- Target markets: ${market}` : null,
    channelPref ? `- Channel preferences: ${channelPref}` : null,
    time ? `- Daily time: ${time}` : null,
    '',
    '## Expanding preferences & ideas',
    '(Preferences, constraints, persona, and ideas from chat keep growing here)',
  ]
    .filter((row) => row !== null)
    .join('\n');
}

export function formatPostPayAnswersMessage(
  card: KickoffCard,
  answers: Record<string, string[]>,
  isZh: boolean
): string {
  const lines = card.questions
    .map((q) => {
      const picked = answers[q.id] ?? [];
      if (picked.length === 0) return null;
      const labels = picked.map(
        (id) => q.options.find((o) => o.id === id)?.label ?? id
      );
      return `${q.question} ${labels.join(isZh ? '、' : ', ')}`;
    })
    .filter(Boolean);
  return `${isZh ? '我的用户档案（固定问卷）：' : 'My profile (fixed questionnaire):'}\n${lines
    .map((l) => `- ${l}`)
    .join('\n')}`;
}

export function buildChannelSelectOptionCard(
  recommendations: Array<{ channelId: string; channelName: string; priority: string }>,
  isZh: boolean
): OptionCard {
  const selectable = recommendations.filter(
    (item) =>
      item.channelId !== FIXED_DIRECTORY_CHANNEL_ID &&
      item.priority !== 'skip'
  );
  return {
    question: isZh
      ? '选择本轮要做的渠道（Directory 固定开启，无需勾选）'
      : 'Pick channels for this round (Directory is always on)',
    multi: true,
    options: selectable.map((item) => ({
      id: item.channelId,
      label: `${item.channelName} · ${item.priority}`,
    })),
  };
}

export function withFixedDirectory(channelIds: string[]): string[] {
  return [...new Set([...channelIds, FIXED_DIRECTORY_CHANNEL_ID])];
}
