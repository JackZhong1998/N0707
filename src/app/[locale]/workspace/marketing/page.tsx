'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import { getMemoryPayload } from '@/lib/gtm/memory';
import { getKickoffGreeting } from '@/lib/gtm/greeting';
import KickoffFormCard from '@/components/gtm/KickoffFormCard';
import ChannelRecommendCard from '@/components/gtm/ChannelRecommendCard';

const PROFILE_SLOTS: Array<{ key: string; zh: string; en: string }> = [
  { key: 'description', zh: '产品定义', en: 'Product' },
  { key: 'icp', zh: '目标用户', en: 'ICP' },
  { key: 'differentiation', zh: '差异化', en: 'Differentiation' },
  { key: 'icpPains', zh: '用户痛点', en: 'Pain points' },
];

export default function MarketingKickoffPage() {
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const {
    state,
    hydrated,
    setKickoffForm,
    mergeProfile,
    addChatMessage,
    setChannelRecommendation,
    updateState,
  } = useGtm();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  // 渠道推荐从全局状态读取：页面切换后不丢失
  const recommendation = state.channelRecommendation;

  useEffect(() => {
    if (!hydrated) return;
    if (!state.onboardingCompleted) {
      router.replace('/workspace/onboarding');
      return;
    }
    if (state.phase === 'execution' || state.phase === 'review') {
      router.replace('/workspace/marketing/today');
      return;
    }
    if (state.phase === 'confirm') {
      router.replace('/workspace/marketing/confirm');
    }
  }, [hydrated, state.onboardingCompleted, state.phase, router]);

  useEffect(() => {
    if (hydrated && state.chatHistory.length === 0 && !greetedRef.current) {
      greetedRef.current = true;
      addChatMessage({
        role: 'assistant',
        content: getKickoffGreeting(state.kickoffForm.productUrl, locale),
      });
    }
  }, [hydrated, state.chatHistory.length, state.kickoffForm.productUrl, locale, addChatMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatHistory.length, recommendation, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    addChatMessage({ role: 'user', content: userMsg });
    setLoading(true);

    try {
      const newRound = state.kickoffRoundCount + 1;
      const res = await fetch('/api/gtm/kickoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory: getMemoryPayload(state),
          history: state.chatHistory,
          message: userMsg,
          roundCount: newRound,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 事实抽取 → 长期记忆
      if (data.extractedFacts && Object.keys(data.extractedFacts).length > 0) {
        mergeProfile(data.extractedFacts);
      }
      addChatMessage({ role: 'assistant', content: data.reply });
      updateState({ kickoffRoundCount: newRound });

      if (data.readyForChannels && !recommendation) {
        await fetchChannels(data.extractedFacts);
      }
    } catch (err) {
      addChatMessage({
        role: 'assistant',
        content: isZh
          ? `出错了：${err instanceof Error ? err.message : '请重试'}`
          : `Error: ${err instanceof Error ? err.message : 'Please retry'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (latestFacts?: Record<string, unknown>) => {
    try {
      const memory = getMemoryPayload(state);
      // 本轮刚抽取的事实可能还没进 state，手动合并
      if (latestFacts) {
        memory.profile = { ...memory.profile, ...latestFacts } as typeof memory.profile;
      }
      const res = await fetch('/api/gtm/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChannelRecommendation(data.recommendation);
    } catch {
      addChatMessage({
        role: 'assistant',
        content: isZh
          ? '渠道推荐生成失败了，再发一条消息我会重试。'
          : 'Channel recommendation failed — send another message and I will retry.',
      });
    }
  };

  const handleToggleChannel = (
    section: 'wave1' | 'wave2' | 'phase0',
    channelId: string
  ) => {
    if (!recommendation) return;
    const updated = {
      ...recommendation,
      [section]: recommendation[section].map((c) =>
        c.channelId === channelId ? { ...c, selected: !c.selected } : c
      ),
    };
    setChannelRecommendation(updated);
  };

  const handleConfirmChannels = () => {
    updateState({ phase: 'confirm' });
    router.push('/workspace/marketing/confirm');
  };

  if (!hydrated) return <div className="p-8 text-sm text-gray-400">Loading...</div>;

  const filledSlots = PROFILE_SLOTS.filter(
    (slot) => state.productProfile[slot.key as keyof typeof state.productProfile]
  );
  const selectedCount = recommendation
    ? [...recommendation.wave1, ...recommendation.phase0].filter((c) => c.selected).length
    : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="shrink-0 border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {isZh ? 'GTM Kickoff' : 'GTM Kickoff'}
            </p>
            <h1 className="mt-0.5 font-display text-lg font-bold text-gray-900">
              {isZh ? '策略顾问 · 定制你的 30 天打法' : 'Strategy Advisor · Your 30-day plan'}
            </h1>
          </div>
          {/* 产品画像收集进度 */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {PROFILE_SLOTS.map((slot) => {
              const filled = filledSlots.includes(slot);
              return (
                <span
                  key={slot.key}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    filled
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-400'
                  }`}
                >
                  {filled ? '✓ ' : ''}
                  {isZh ? slot.zh : slot.en}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 左侧快填卡片 */}
        <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-5 lg:block">
          <KickoffFormCard form={state.kickoffForm} onSubmit={setKickoffForm} locale={locale} />
          <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
            {isZh
              ? '卡片信息会实时进入顾问的记忆，右侧对话不再重复问这些问题。'
              : 'Card inputs feed the advisor’s memory — it won’t re-ask these.'}
          </p>
        </aside>

        {/* 对话区 */}
        <div className="flex min-w-0 flex-1 flex-col bg-gray-50/50">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto max-w-2xl space-y-4">
              {/* 移动端卡片 */}
              <div className="lg:hidden">
                <KickoffFormCard form={state.kickoffForm} onSubmit={setKickoffForm} locale={locale} />
              </div>

              {state.chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-200 bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
                  {isZh ? '顾问思考中…' : 'Advisor thinking…'}
                </div>
              )}

              {recommendation && (
                <div className="pt-2">
                  <ChannelRecommendCard
                    recommendation={recommendation}
                    onToggle={handleToggleChannel}
                    locale={locale}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmChannels}
                    disabled={selectedCount === 0}
                    className="mt-4 w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
                  >
                    {isZh
                      ? `确认 ${selectedCount} 个渠道 · 查看策略摘要`
                      : `Confirm ${selectedCount} channels · View strategy summary`}
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {!recommendation && (
            <div className="shrink-0 border-t border-gray-200 bg-white px-8 py-4">
              <div className="mx-auto flex max-w-2xl gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isZh ? '回答顾问的问题…' : 'Answer the advisor…'}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
                >
                  {isZh ? '发送' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
