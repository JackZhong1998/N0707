'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';
import { getMemoryPayload } from '@/lib/gtm/memory';
import GenerationProgressView from '@/components/gtm/GenerationProgress';
import PlaybookCard from '@/components/gtm/PlaybookCard';
import type { PlaybookDisplay } from '@/lib/agents/skills/registry';

export default function ConfirmStrategyPage() {
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated, updateState, setCalendar } = useGtm();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [playbooks, setPlaybooks] = useState<PlaybookDisplay[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (state.phase === 'execution' || state.phase === 'review') {
      router.replace('/workspace/marketing/today');
    }
  }, [hydrated, state.phase, router]);

  useEffect(() => {
    fetch('/api/gtm/playbooks')
      .then((r) => r.json())
      .then((d) => setPlaybooks(d.playbooks ?? []))
      .catch(() => {});
  }, []);

  const selectedChannels = [
    ...(state.channelRecommendation?.phase0.filter((c) => c.selected) ?? []),
    ...(state.channelRecommendation?.wave1.filter((c) => c.selected) ?? []),
  ];
  const channelIds = [...new Set(selectedChannels.map((c) => c.channelId))];
  const selectedPlaybooks = playbooks.filter((p) => channelIds.includes(p.channelId));
  const profile = state.productProfile;

  const handleGenerate = async () => {
    if (channelIds.length === 0) {
      setError(isZh ? '请至少选择一个渠道' : 'Select at least one channel');
      return;
    }
    setGenerating(true);
    setError('');
    updateState({
      phase: 'strategy',
      generationProgress: {
        step: 1,
        total: 4,
        message: isZh ? '正在制定渠道策略…' : 'Building channel strategies…',
      },
    });

    try {
      updateState({
        generationProgress: {
          step: 2,
          total: 4,
          message: isZh ? '正在排期 30 天任务…' : 'Scheduling 30-day tasks…',
        },
      });

      const res = await fetch('/api/gtm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds,
          memory: getMemoryPayload(state),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateState({
        generationProgress: {
          step: 3,
          total: 4,
          message: isZh ? '正在预写前 3 天内容…' : 'Pre-writing content…',
        },
      });

      setCalendar(data.calendar);
      updateState({
        phase: 'execution',
        channelStrategies: data.strategies,
        strategySummary: data.strategySummary,
        campaignStartDate: data.campaignStartDate,
        currentDayIndex: 1,
        selectedChannels: channelIds,
        generationProgress: undefined,
      });

      router.push('/workspace/marketing/today');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      updateState({ phase: 'confirm', generationProgress: undefined });
    } finally {
      setGenerating(false);
    }
  };

  if (!hydrated) return <div className="p-8 text-sm text-gray-400">Loading...</div>;

  if (generating && state.generationProgress) {
    return <GenerationProgressView progress={state.generationProgress} locale={locale} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {isZh ? '最后确认' : 'Final confirmation'}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-gray-900">
        {isZh ? '你的作战方案摘要' : 'Your battle plan summary'}
      </h1>
      <p className="mt-1.5 text-sm text-gray-500">
        {isZh
          ? '确认无误后生成 30 天行动日历。之后随时可以在「市场策略」页和策略顾问对话调整。'
          : 'Confirm to generate your 30-day calendar. You can adjust anytime via the Strategy Agent.'}
      </p>

      {/* 顾问理解的产品画像 */}
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">
          {isZh ? '顾问对你产品的理解' : 'What the advisor understood'}
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {[
            [isZh ? '产品' : 'Product', profile.description ?? profile.name],
            [isZh ? '目标用户' : 'ICP', profile.icp],
            [isZh ? '差异化' : 'Differentiation', profile.differentiation],
            [isZh ? '用户痛点' : 'Pain points', profile.icpPains],
            [isZh ? '30 天目标' : '30-day goal', state.kickoffForm.thirtyDayGoal],
            [isZh ? '每日投入' : 'Daily budget', state.kickoffForm.dailyTimeBudget],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-gray-800">{value}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-4 text-xs text-gray-400">
          {isZh ? '理解有偏差？' : 'Something off? '}
          <button
            type="button"
            onClick={() => {
              updateState({ phase: 'kickoff' });
              router.push('/workspace/marketing');
            }}
            className="font-medium text-gray-600 underline hover:text-gray-900"
          >
            {isZh ? '返回对话补充信息' : 'Go back and clarify'}
          </button>
        </p>
      </section>

      {/* 主战场 */}
      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">
          {isZh ? `主战场 · ${selectedChannels.length} 个渠道` : `Main channels · ${selectedChannels.length}`}
        </h2>
        <div className="mt-3 space-y-2.5">
          {selectedChannels.map((c) => (
            <div key={c.channelId} className="flex items-start gap-3">
              <span className="mt-0.5 rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                {c.name}
              </span>
              <p className="text-sm leading-relaxed text-gray-600">{c.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 方法论背书 */}
      {selectedPlaybooks.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            {isZh ? '这些渠道将按以下实战方法论执行' : 'Executed with these battle-tested playbooks'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedPlaybooks.map((pb) => (
              <PlaybookCard key={pb.channelId} playbook={pb} locale={locale} compact />
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || channelIds.length === 0}
        className="mt-8 w-full rounded-xl bg-gray-900 py-4 text-base font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
      >
        {isZh ? '确认方案 · 生成 30 天行动日历' : 'Confirm · Generate 30-day calendar'}
      </button>
      <p className="mt-2.5 text-center text-xs text-gray-400">
        {isZh ? '约需 1-2 分钟 · 前 3 天内容将同步预写好' : 'Takes 1-2 min · Day 1-3 content pre-written'}
      </p>
    </div>
  );
}
