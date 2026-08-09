import type {
  MemoryFact,
  RewritePreference,
  RewritePreferenceKind,
} from './types';

const PREFERENCE_KINDS = new Set<RewritePreferenceKind>([
  'length',
  'tone',
  'wording',
  'structure',
  'format',
  'emoji',
  'cta',
  'claims',
  'other',
]);

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeRewritePreferences(value: unknown): RewritePreference[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const item = candidate as Record<string, unknown>;
    const scope = item.scope === 'global' || item.scope === 'channel'
      ? item.scope
      : null;
    const kind = clean(item.kind, 40) as RewritePreferenceKind;
    const rule = clean(item.rule, 500);
    if (!scope || !PREFERENCE_KINDS.has(kind) || !rule) return [];
    return [{ scope, kind, rule }];
  });
}

export function inferRewritePreferences(feedback: string): RewritePreference[] {
  const text = clean(feedback, 4_000);
  if (!text) return [];
  const scope: RewritePreference['scope'] =
    /(?:我(?:平时|通常|一直|从来|不喜欢|不会)|我的(?:表达|语气|内容|文案)|\bi (?:never|usually|do not|don't)\b|\bmy (?:voice|writing|content)\b)/i.test(text)
      ? 'global'
      : 'channel';
  const inferred: RewritePreference[] = [];
  const add = (kind: RewritePreferenceKind, rule: string) => {
    if (!inferred.some((item) => item.kind === kind)) {
      inferred.push({ scope, kind, rule });
    }
  };

  if (/(?:太长|\u5570\u55e6|\u5570\u5526|话多|精简|简短|短一点|别写那么多|too long|shorter|more concise|wordy)/i.test(text)) {
    add('length', '内容保持简洁，删掉重复解释和不必要的铺垫。');
  } else if (/(?:太短|展开一点|更详细|多点细节|too short|more detail|expand on)/i.test(text)) {
    add('length', '内容要有足够的具体细节，不要过度精简。');
  }
  if (/(?:官话|官方口吻|不像人话|不自然|口语一点|别这么正式|too formal|robotic|more natural|conversational)/i.test(text)) {
    add('tone', '语气自然、口语化，像真人直接表达，不用公文腔。');
  }
  if (/(?:AI 味|AI味|机器味|套话|陈词滥调|ai[- ]?sounding|cliché|generic phrases?)/i.test(text)) {
    add('wording', '避免 AI 腔、套话和陈词滥调，优先使用具体、直接的表达。');
  }
  if (/(?:emoji.{0,4}太多|表情.{0,4}太多|不要 emoji|别用表情|no emojis?|too many emojis?)/i.test(text)) {
    add('emoji', '少用或不使用 Emoji。');
  } else if (/(?:加点 emoji|加点表情|use emojis?|add emojis?)/i.test(text)) {
    add('emoji', '可以适量使用 Emoji，但不要影响阅读。');
  }
  if (/(?:推销感太强|太像广告|别硬卖|弱化 cta|too salesy|hard sell|less promotional)/i.test(text)) {
    add('cta', 'CTA 要自然、克制，不要硬推销或像广告。');
  }
  if (/(?:太夸张|别吹|不要编数据|别编故事|overclaim|exaggerat|invent(?:ed)? (?:data|story|facts?))/i.test(text)) {
    add('claims', '避免夸张主张，不编造数据、故事或个人经历。');
  }
  return inferred.slice(0, 4);
}

function preferenceKey(
  preference: RewritePreference,
  channelId: string
): string {
  const target = preference.scope === 'global' ? 'all' : channelId;
  return `content_preference_${preference.scope}_${target}_${preference.kind}`
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .slice(0, 80);
}

export function saveRewritePreferences(input: {
  memoryFacts: MemoryFact[];
  preferences: RewritePreference[];
  channelId: string;
  todoId: string;
  sourceMessageIds?: string[];
  now?: number;
}): MemoryFact[] {
  const now = input.now ?? Date.now();
  const next = new Map(
    input.memoryFacts.map((fact) => [`${fact.category}:${fact.key}`, fact])
  );
  for (const preference of input.preferences) {
    const key = preferenceKey(preference, input.channelId);
    const lookupKey = `preference:${key}`;
    const previous = next.get(lookupKey);
    next.set(lookupKey, {
      id: previous?.id ?? crypto.randomUUID(),
      category: 'preference',
      key,
      value: preference.rule,
      confidence: 1,
      confirmed: true,
      sourceMessageIds: [
        ...new Set([
          ...(previous?.sourceMessageIds ?? []),
          ...(input.sourceMessageIds ?? []),
        ]),
      ].slice(-24),
      updatedAt: now,
      scope: preference.scope,
      ...(preference.scope === 'channel'
        ? { channelId: input.channelId }
        : {}),
      sourceTodoId: input.todoId,
    });
  }
  return [...next.values()]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 120);
}

export function relevantMemoryFacts(
  memoryFacts: MemoryFact[],
  channelId?: string,
  max = 40
): MemoryFact[] {
  const relevantPreferences = memoryFacts.filter(
    (fact) =>
      fact.category === 'preference' &&
      (fact.scope !== 'channel' || fact.channelId === channelId)
  );
  const otherFacts = memoryFacts.filter(
    (fact) => fact.category !== 'preference'
  );
  relevantPreferences.sort((left, right) => right.updatedAt - left.updatedAt);
  otherFacts.sort((left, right) => right.updatedAt - left.updatedAt);
  return [...relevantPreferences, ...otherFacts].slice(0, max);
}
