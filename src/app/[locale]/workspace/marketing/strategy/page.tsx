'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import { getMemoryPayload } from '@/lib/gtm/memory';
import { mergeReplannedCalendar } from '@/lib/gtm/plan-utils';
import PlaybookCard from '@/components/gtm/PlaybookCard';
import type { PlaybookDisplay } from '@/lib/agents/skills/registry';

const QUICK_PROMPTS_ZH = [
  '为什么给我推荐这几个渠道？',
  '目前哪类内容效果最好？',
  '我想减少任务量，怎么调整？',
  '我想换一个渠道试试',
];
const QUICK_PROMPTS_EN = [
  'Why these channels for me?',
  'What content is working so far?',
  'I want fewer tasks per day',
  'I want to try a different channel',
];

export default function StrategyPage() {
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated, addStrategyChatMessage, updateState, setCalendar } = useGtm();

  const [input, setInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [pendingDirective, setPendingDirective] = useState<string | null>(null);
  const [replanning, setReplanning] = useState(false);
  const [playbooks, setPlaybooks] = useState<PlaybookDisplay[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!state.onboardingCompleted) {
      router.replace('/workspace/onboarding');
      return;
    }
    if (state.phase === 'kickoff' || state.phase === 'onboarding') {
      router.replace('/workspace/marketing');
    }
  }, [hydrated, state.onboardingCompleted, state.phase, router]);

  useEffect(() => {
    fetch('/api/gtm/playbooks')
      .then((r) => r.json())
      .then((d) => setPlaybooks(d.playbooks ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.strategyChat.length, chatting]);

  const summary = state.strategySummary;
  const selectedPlaybooks = playbooks.filter((p) =>
    state.selectedChannels.includes(p.channelId)
  );

  const sendChat = async (text: string) => {
    if (!text.trim() || chatting) return;
    setInput('');
    addStrategyChatMessage({ role: 'user', content: text });
    setChatting(true);
    try {
      const res = await fetch('/api/gtm/strategy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory: getMemoryPayload(state),
          calendar: state.unifiedCalendar,
          history: state.strategyChat,
          message: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let reply = data.reply as string;
      if (data.adjustments?.length) {
        reply += '\n\n' + (isZh ? '建议调整：' : 'Suggested adjustments:') + '\n' +
          data.adjustments.map((a: string) => `· ${a}`).join('\n');
      }
      addStrategyChatMessage({ role: 'assistant', content: reply });
      if (data.replanDirective) {
        setPendingDirective(data.replanDirective);
      }
    } catch (err) {
      addStrategyChatMessage({
        role: 'assistant',
        content: isZh
          ? `出错了：${err instanceof Error ? err.message : '请重试'}`
          : `Error: ${err instanceof Error ? err.message : 'please retry'}`,
      });
    } finally {
      setChatting(false);
    }
  };

  const applyReplan = async () => {
    if (!pendingDirective || replanning) return;
    setReplanning(true);
    try {
      const res = await fetch('/api/gtm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds: state.selectedChannels,
          memory: getMemoryPayload(state),
          directives: `${pendingDirective}\n\n注意：只有第 ${state.currentDayIndex} 天及之后的任务会被采用，请把重点放在这些天。`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const merged = mergeReplannedCalendar(
        state.unifiedCalendar,
        data.calendar,
        state.currentDayIndex
      );
      setCalendar(merged);
      updateState({ channelStrategies: data.strategies, strategySummary: data.strategySummary });
      setPendingDirective(null);
      addStrategyChatMessage({
        role: 'assistant',
        content: isZh
          ? `已按新方向重排了第 ${state.currentDayIndex} 天之后的日历。去「今日行动」看看新的安排吧。`
          : `Calendar replanned from day ${state.currentDayIndex}. Check the Today page for your new plan.`,
      });
    } catch (err) {
      addStrategyChatMessage({
        role: 'assistant',
        content: isZh
          ? `重排失败：${err instanceof Error ? err.message : '请重试'}`
          : `Replan failed: ${err instanceof Error ? err.message : 'please retry'}`,
      });
    } finally {
      setReplanning(false);
    }
  };

  if (!hydrated) return <div className="p-8 text-sm text-gray-400">Loading...</div>;

  const quickPrompts = isZh ? QUICK_PROMPTS_ZH : QUICK_PROMPTS_EN;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Strategy overview */}
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {isZh ? '市场策略' : 'Marketing Strategy'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-gray-900">
            {isZh ? '你的 30 天作战方案' : 'Your 30-Day Battle Plan'}
          </h1>
        </header>

        {summary ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <OverviewCard
                label={isZh ? '30 天目标' : '30-day goal'}
                value={summary.thirtyDayGoal}
              />
              <OverviewCard
                label={isZh ? '主战场' : 'Main channels'}
                value={summary.mainChannels.join(' + ')}
              />
              <OverviewCard label={isZh ? '执行节奏' : 'Rhythm'} value={summary.rhythm} />
              <OverviewCard
                label={isZh ? '明确不做' : 'Not doing'}
                value={summary.notDoing.join(' · ')}
              />
            </div>

            {summary.weeklyArc && summary.weeklyArc.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold text-gray-900">
                  {isZh ? '四周叙事主线' : 'Four-week narrative arc'}
                </h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {summary.weeklyArc.map((week) => (
                    <div key={week.week} className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-[11px] font-semibold text-gray-400">
                        {isZh ? `第 ${week.week} 周` : `Week ${week.week}`}
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{week.theme}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{week.focus}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            {isZh ? '策略尚未生成，先完成 Kickoff 对话' : 'No strategy yet — complete Kickoff first'}
          </div>
        )}

        {/* Playbook trust section */}
        {selectedPlaybooks.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {isZh ? '你的策略基于这些实战方法论' : 'Built on battle-tested playbooks'}
              </h2>
              <span className="text-[11px] text-gray-400">
                {isZh ? '来自 40+ 增长 Playbook 体系' : 'From a 40+ growth playbook system'}
              </span>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {selectedPlaybooks.map((pb) => (
                <PlaybookCard key={pb.channelId} playbook={pb} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Strategy agent chat */}
      <aside className="flex w-[400px] shrink-0 flex-col border-l border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
              <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M10 3.5l6.5 3.25L10 10 3.5 6.75 10 3.5z" strokeLinejoin="round" />
                <path d="M3.5 10.25L10 13.5l6.5-3.25M3.5 13.75L10 17l6.5-3.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isZh ? '策略顾问' : 'Strategy Agent'}
              </p>
              <p className="text-[11px] text-gray-400">
                {isZh ? '记得你的产品、策略和每一次复盘' : 'Remembers your product, plan & reviews'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {state.strategyChat.length === 0 && (
            <div className="rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-500">
              {isZh
                ? '想调整策略、换渠道、增减任务量，或者想知道"为什么这样安排"——直接问我。确认大调整后我会帮你重排后续日历。'
                : 'Ask me to adjust strategy, swap channels, change workload, or explain the plan. Confirmed changes will replan your remaining calendar.'}
            </div>
          )}
          {state.strategyChat.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-100 bg-gray-50 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatting && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
              {isZh ? '分析中…' : 'Analyzing…'}
            </div>
          )}
          {pendingDirective && (
            <div className="rounded-xl border border-gray-900 bg-gray-900 p-4 text-white">
              <p className="text-xs font-semibold">
                {isZh ? '确认重排后续日历？' : 'Replan remaining calendar?'}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-300">{pendingDirective}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={applyReplan}
                  disabled={replanning}
                  className="flex-1 rounded-lg bg-white py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                >
                  {replanning ? (isZh ? '重排中…' : 'Replanning…') : isZh ? '应用调整' : 'Apply'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDirective(null)}
                  disabled={replanning}
                  className="rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendChat(prompt)}
                disabled={chatting}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat(input)}
              placeholder={isZh ? '和策略顾问聊聊…' : 'Talk to your strategy agent…'}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] focus:border-gray-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => sendChat(input)}
              disabled={chatting || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-gray-900">{value}</p>
    </div>
  );
}
