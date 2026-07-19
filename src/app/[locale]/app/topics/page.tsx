'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import type {
  Topic,
  TopicPriority,
  TopicStatus,
  TopicVariantStatus,
} from '@/lib/gtm/types';

type StatusFilter = 'all' | TopicStatus;

const CHANNEL_NAMES: Record<string, string> = {
  xiaohongshu: '小红书',
  twitter_x: 'X',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  product_hunt: 'Product Hunt',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

const PRIORITY_ORDER: Record<TopicPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const TOPIC_STATUSES: TopicStatus[] = [
  'idea',
  'shortlisted',
  'scheduled',
  'published',
  'archived',
];

const VARIANT_STATUSES: TopicVariantStatus[] = [
  'draft',
  'selected',
  'scheduled',
  'published',
  'rejected',
];

function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

function statusLabel(status: TopicStatus, isZh: boolean) {
  const labels: Record<TopicStatus, [string, string]> = {
    idea: ['灵感', 'Idea'],
    shortlisted: ['已入选', 'Shortlisted'],
    scheduled: ['已排期', 'Scheduled'],
    published: ['已发布', 'Published'],
    archived: ['已归档', 'Archived'],
  };
  return labels[status][isZh ? 0 : 1];
}

function variantStatusLabel(status: TopicVariantStatus, isZh: boolean) {
  const labels: Record<TopicVariantStatus, [string, string]> = {
    draft: ['草稿', 'Draft'],
    selected: ['已选择', 'Selected'],
    scheduled: ['已排期', 'Scheduled'],
    published: ['已发布', 'Published'],
    rejected: ['不采用', 'Rejected'],
  };
  return labels[status][isZh ? 0 : 1];
}

function sourceLabel(topic: Topic, isZh: boolean) {
  if (topic.sourceLabel) return topic.sourceLabel;
  const labels: Record<Topic['source'], [string, string]> = {
    strategy: ['市场策略', 'Strategy'],
    user: ['用户想法', 'User'],
    research: ['市场研究', 'Research'],
    performance: ['数据复盘', 'Performance'],
    agent: ['Agent 建议', 'Agent'],
    custom: ['自定义', 'Custom'],
  };
  return labels[topic.source][isZh ? 0 : 1];
}

function priorityLabel(priority: TopicPriority, isZh: boolean) {
  const labels: Record<TopicPriority, [string, string]> = {
    high: ['高优先级', 'High'],
    medium: ['中优先级', 'Medium'],
    low: ['低优先级', 'Low'],
  };
  return labels[priority][isZh ? 0 : 1];
}

export default function TopicsPage() {
  const gtm = useGtm();
  const { store, hydrated } = gtm;
  const { setViewContext, clearViewContext } = useViewContext();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [query, setQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [addingVariantFor, setAddingVariantFor] = useState<string | null>(null);
  const [variantChannel, setVariantChannel] = useState('xiaohongshu');
  const [variantHook, setVariantHook] = useState('');
  const [variantAngle, setVariantAngle] = useState('');

  useEffect(() => {
    setViewContext({
      view: 'topic_library',
      entityType: 'topic_library',
      title: isZh ? '选题库' : 'Topic library',
    });
    return clearViewContext;
  }, [clearViewContext, isZh, setViewContext]);

  const channels = useMemo(() => {
    const ids = new Set([
      ...store.channels,
      ...store.topicVariants.map((variant) => variant.channelId),
    ]);
    if (ids.size === 0) {
      ids.add('xiaohongshu');
      ids.add('twitter_x');
    }
    return [...ids].map((id) => ({
      id,
      name: store.channelStrategies[id]?.channelName ?? CHANNEL_NAMES[id] ?? id,
    }));
  }, [store.channels, store.channelStrategies, store.topicVariants]);

  const variantsByTopic = useMemo(() => {
    const result = new Map<string, typeof store.topicVariants>();
    for (const variant of store.topicVariants) {
      const list = result.get(variant.topicId) ?? [];
      list.push(variant);
      result.set(variant.topicId, list);
    }
    return result;
  }, [store.topicVariants]);

  const visibleTopics = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return store.topics
      .filter((topic) => {
        if (statusFilter !== 'all' && topic.status !== statusFilter) return false;
        const variants = variantsByTopic.get(topic.id) ?? [];
        if (
          channelFilter !== 'all' &&
          !variants.some((variant) => variant.channelId === channelFilter)
        ) {
          return false;
        }
        if (!normalizedQuery) return true;
        return [topic.title, topic.targetAudience, topic.painPoint, topic.corePoint]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          b.updatedAt - a.updatedAt
      );
  }, [
    channelFilter,
    query,
    statusFilter,
    store.topics,
    variantsByTopic,
  ]);

  const scheduledCount = store.topics.filter((topic) =>
    ['scheduled', 'published'].includes(topic.status)
  ).length;
  const activeVariantCount = store.topicVariants.filter(
    (variant) => variant.status !== 'rejected'
  ).length;

  const createQuickTopic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = query.trim();
    if (!title) return;
    const topic = gtm.createTopic({
      title,
      source: 'user',
      targetAudience: '',
      painPoint: '',
      corePoint: '',
      priority: 'medium',
      status: 'idea',
    });
    setQuery('');
    setExpanded((current) => new Set(current).add(topic.id));
  };

  const createSamples = () => {
    const first = gtm.createTopic({
      title: isZh
        ? '为什么独立开发者总把营销开始得太晚'
        : 'Why indie makers start marketing too late',
      source: 'agent',
      targetAudience: isZh ? '正在冷启动产品的独立开发者' : 'Indie makers launching a product',
      painPoint: isZh ? '产品快上线时才发现没有受众' : 'Reaching launch day without an audience',
      corePoint: isZh
        ? '营销不是发布前的冲刺，而是从第一天开始的用户对话'
        : 'Marketing is a user conversation that starts on day one',
      priority: 'high',
      status: 'shortlisted',
    });
    gtm.createTopicVariant({
      topicId: first.id,
      channelId: 'xiaohongshu',
      channelName: '小红书',
      hook: isZh ? '我花 6 个月做产品，却把最重要的事留到了最后' : 'I spent six months building—and left the most important part until last',
      angle: isZh ? '创始人真实踩坑复盘' : 'Founder mistake story',
      format: isZh ? '故事型图文' : 'Story carousel',
      cta: isZh ? '你从第几天开始做营销？' : 'When did you start marketing?',
      status: 'selected',
    });
    gtm.createTopicVariant({
      topicId: first.id,
      channelId: 'twitter_x',
      channelName: 'X',
      hook: 'Building in public is not a launch tactic.',
      angle: 'Contrarian founder lesson',
      format: 'Thread',
      cta: 'Reply with the week you started talking to users.',
      status: 'draft',
    });

    const second = gtm.createTopic({
      title: isZh ? '用 7 天验证一个产品定位' : 'Validate positioning in seven days',
      source: 'strategy',
      targetAudience: isZh ? '还没有稳定转化的早期产品团队' : 'Early teams without repeatable conversion',
      painPoint: isZh ? '用户能看懂功能，却不知道为什么要现在购买' : 'Users understand features but not why they should buy now',
      corePoint: isZh ? '先验证最尖锐的用户痛点，再打磨定位文案' : 'Validate the sharpest pain before polishing the copy',
      priority: 'medium',
      status: 'idea',
    });
    gtm.createTopicVariant({
      topicId: second.id,
      channelId: 'linkedin',
      channelName: 'LinkedIn',
      hook: 'Your positioning does not need another workshop.',
      angle: 'Seven-day practical experiment',
      format: 'Text post',
      cta: 'Save the checklist for your next launch.',
      status: 'draft',
    });
    setExpanded(new Set([first.id, second.id]));
  };

  const submitVariant = (event: FormEvent<HTMLFormElement>, topicId: string) => {
    event.preventDefault();
    const channel =
      channels.find((item) => item.id === variantChannel) ?? channels[0];
    if (!channel || !variantHook.trim()) return;
    gtm.createTopicVariant({
      topicId,
      channelId: channel.id,
      channelName: channel.name,
      hook: variantHook.trim(),
      angle: variantAngle.trim(),
      format: '',
      cta: '',
      status: 'draft',
    });
    setVariantHook('');
    setVariantAngle('');
    setAddingVariantFor(null);
    setExpanded((current) => new Set(current).add(topicId));
  };

  const toggleExpanded = (topicId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-[#09090b] text-zinc-500">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] animate-pulse-soft">
          {isZh ? '正在读取选题库…' : 'Loading topic library…'}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#09090b] bg-grid-dark text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
              {isZh ? 'Agent 执行工作台' : 'Agent workspace'}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">
              {isZh ? '选题库' : 'Topic library'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {isZh
                ? '先沉淀跨渠道的核心观点，再让 Agent 为每个渠道找到最合适的表达方式。'
                : 'Keep the core idea independent, then let the Agent shape it for each channel.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08]">
            {[
              [store.topics.length, isZh ? '核心选题' : 'Topics'],
              [activeVariantCount, isZh ? '渠道版本' : 'Variants'],
              [scheduledCount, isZh ? '已进入执行' : 'In execution'],
            ].map(([value, label]) => (
              <div key={String(label)} className="min-w-[92px] bg-[#111113] px-4 py-3">
                <p className="font-mono text-xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-[10px] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-7 rounded-2xl border border-white/[0.08] bg-[#111113]/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <form onSubmit={createQuickTopic} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m16 16 4 4" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  isZh
                    ? '搜索选题，或输入一个新想法后按 Enter…'
                    : 'Search topics, or type a new idea and press Enter…'
                }
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/30 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/20"
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              <PlusIcon />
              {isZh ? '快速新增' : 'Quick add'}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
              {isZh ? '筛选' : 'Filters'}
            </span>
            <select
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
              className="h-8 rounded-lg border border-white/[0.08] bg-[#18181b] px-2.5 text-xs text-zinc-300 outline-none focus:border-white/20"
            >
              <option value="all">{isZh ? '全部渠道' : 'All channels'}</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-8 rounded-lg border border-white/[0.08] bg-[#18181b] px-2.5 text-xs text-zinc-300 outline-none focus:border-white/20"
            >
              <option value="all">{isZh ? '全部状态' : 'All statuses'}</option>
              {TOPIC_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status, isZh)}
                </option>
              ))}
            </select>
            {(channelFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setChannelFilter('all');
                  setStatusFilter('all');
                }}
                className="px-2 text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                {isZh ? '清除筛选' : 'Clear'}
              </button>
            )}
          </div>
        </section>

        <div className="mt-4 space-y-3 pb-16">
          {visibleTopics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#111113]/85 px-6 py-16 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400">
                <PlusIcon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-200">
                {store.topics.length
                  ? isZh
                    ? '没有符合筛选条件的选题'
                    : 'No topics match these filters'
                  : isZh
                    ? '从一个核心观点开始'
                    : 'Start with one core idea'}
              </p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-500">
                {isZh
                  ? '核心选题不绑定渠道。同一个观点可以继续派生为小红书图文、X Thread 或 LinkedIn 帖子。'
                  : 'A core topic is channel-independent and can become a carousel, thread, or long-form post.'}
              </p>
              {store.topics.length === 0 && (
                <button
                  type="button"
                  onClick={createSamples}
                  className="mt-5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.1]"
                >
                  {isZh ? '创建一组示例选题' : 'Create sample topics'}
                </button>
              )}
            </div>
          ) : (
            visibleTopics.map((topic) => {
              const variants = variantsByTopic.get(topic.id) ?? [];
              const shownVariants =
                channelFilter === 'all'
                  ? variants
                  : variants.filter((variant) => variant.channelId === channelFilter);
              const isOpen = expanded.has(topic.id);
              return (
                <article
                  key={topic.id}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113]/95 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span
                        title={priorityLabel(topic.priority, isZh)}
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                          topic.priority === 'high'
                            ? 'bg-amber-400 shadow-[0_0_9px_rgba(251,191,36,0.55)]'
                            : topic.priority === 'medium'
                              ? 'bg-sky-400'
                              : 'bg-zinc-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setViewContext({
                            view: 'topic_detail',
                            entityType: 'topic',
                            entityId: topic.id,
                            title: topic.title,
                            selectedText: [
                              `目标人群：${topic.targetAudience}`,
                              `痛点：${topic.painPoint}`,
                              `核心观点：${topic.corePoint}`,
                            ].join('\n'),
                            revision: topic.updatedAt,
                          });
                          toggleExpanded(topic.id);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[15px] font-semibold leading-6 tracking-[-0.015em] text-zinc-100">
                            {topic.title}
                          </h2>
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] text-zinc-500">
                            {sourceLabel(topic, isZh)}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-1 text-xs text-zinc-500">
                          {topic.corePoint ||
                            (isZh ? '等待补充核心观点' : 'Core point not defined yet')}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <select
                          aria-label={isZh ? '选题状态' : 'Topic status'}
                          value={topic.status}
                          onChange={(event) =>
                            gtm.updateTopic(topic.id, {
                              status: event.target.value as TopicStatus,
                            })
                          }
                          className="h-8 rounded-lg border border-white/[0.08] bg-[#18181b] px-2 text-[10px] text-zinc-300 outline-none"
                        >
                          {TOPIC_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status, isZh)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setViewContext({
                              view: 'topic_detail',
                              entityType: 'topic',
                              entityId: topic.id,
                              title: topic.title,
                              selectedText: [
                                `目标人群：${topic.targetAudience}`,
                                `痛点：${topic.painPoint}`,
                                `核心观点：${topic.corePoint}`,
                              ].join('\n'),
                              revision: topic.updatedAt,
                            });
                            toggleExpanded(topic.id);
                          }}
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-white"
                        >
                          <ChevronIcon open={isOpen} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 pl-5">
                      {variants.map((variant) => (
                        <span
                          key={variant.id}
                          className="rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 text-[10px] text-zinc-400"
                        >
                          {variant.channelName}
                        </span>
                      ))}
                      {variants.length === 0 && (
                        <span className="text-[10px] text-zinc-600">
                          {isZh ? '还没有渠道版本' : 'No channel variants yet'}
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                        {priorityLabel(topic.priority, isZh)}
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-white/[0.07] bg-black/20 px-4 py-4 sm:px-5">
                      <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] md:grid-cols-3">
                        {[
                          [
                            isZh ? '目标人群' : 'Audience',
                            topic.targetAudience ||
                              (isZh ? '待 Agent 补充' : 'Waiting for Agent'),
                          ],
                          [
                            isZh ? '用户痛点' : 'Pain point',
                            topic.painPoint ||
                              (isZh ? '待 Agent 补充' : 'Waiting for Agent'),
                          ],
                          [
                            isZh ? '核心观点' : 'Core point',
                            topic.corePoint ||
                              (isZh ? '待 Agent 补充' : 'Waiting for Agent'),
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-[#101012] p-3.5">
                            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                              {label}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-zinc-300">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold text-zinc-200">
                            {isZh ? '渠道表达版本' : 'Channel variants'}
                          </h3>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {isZh
                              ? '同一个观点，在不同渠道使用不同切入角度。'
                              : 'One idea, shaped for the conventions of each channel.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingVariantFor(
                              addingVariantFor === topic.id ? null : topic.id
                            );
                            setVariantChannel(channels[0]?.id ?? 'xiaohongshu');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.09]"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          {isZh ? '添加版本' : 'Add variant'}
                        </button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {shownVariants.map((variant) => (
                          <div
                            key={variant.id}
                            onClick={() =>
                              setViewContext({
                                view: 'topic_variant_detail',
                                entityType: 'topic_variant',
                                entityId: variant.id,
                                title: `${variant.channelName} · ${topic.title}`,
                                channelId: variant.channelId,
                                selectedText: [
                                  `核心选题：${topic.title}`,
                                  `Hook：${variant.hook}`,
                                  `角度：${variant.angle}`,
                                  `形式：${variant.format}`,
                                  `CTA：${variant.cta}`,
                                ].join('\n'),
                                revision: variant.updatedAt,
                              })
                            }
                            className="group rounded-xl border border-white/[0.07] bg-[#151518] p-3.5"
                          >
                            <div className="flex flex-wrap items-start gap-3">
                              <span className="rounded-md bg-white/[0.07] px-2 py-1 text-[10px] font-medium text-zinc-300">
                                {variant.channelName}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium leading-5 text-zinc-200">
                                  {variant.hook ||
                                    (isZh ? '尚未编写 Hook' : 'Hook not written yet')}
                                </p>
                                <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                                  {variant.angle ||
                                    (isZh ? '尚未确定切入角度' : 'Angle not defined yet')}
                                  {variant.format ? ` · ${variant.format}` : ''}
                                  {variant.cta ? ` · CTA: ${variant.cta}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setViewContext({
                                    view: 'topic_variant_detail',
                                    entityType: 'topic_variant',
                                    entityId: variant.id,
                                    title: `${variant.channelName} · ${topic.title}`,
                                    channelId: variant.channelId,
                                    selectedText: [
                                      `核心选题：${topic.title}`,
                                      `Hook：${variant.hook}`,
                                      `角度：${variant.angle}`,
                                      `形式：${variant.format}`,
                                      `CTA：${variant.cta}`,
                                    ].join('\n'),
                                    revision: variant.updatedAt,
                                  });
                                  window.dispatchEvent(
                                    new Event('nowbuild:open-agent')
                                  );
                                }}
                                className="h-7 rounded-md border border-white/[0.08] px-2 text-[9px] text-zinc-400 hover:border-white/20 hover:text-white"
                              >
                                {isZh ? '讨论 / 排期' : 'Discuss / schedule'}
                              </button>
                              <select
                                aria-label={isZh ? '渠道版本状态' : 'Variant status'}
                                value={variant.status}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  gtm.updateTopicVariant(variant.id, {
                                    status: event.target.value as TopicVariantStatus,
                                  })
                                }
                                className="h-7 rounded-md border border-white/[0.08] bg-[#1c1c20] px-2 text-[9px] text-zinc-400 outline-none"
                              >
                                {VARIANT_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {variantStatusLabel(status, isZh)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  gtm.deleteTopicVariant(variant.id);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-700 opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                                aria-label={isZh ? '删除渠道版本' : 'Delete variant'}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        ))}
                        {shownVariants.length === 0 && addingVariantFor !== topic.id && (
                          <div className="rounded-xl border border-dashed border-white/[0.07] px-4 py-6 text-center text-[11px] text-zinc-600">
                            {isZh
                              ? '添加第一个渠道版本，让核心观点进入内容生产。'
                              : 'Add a channel variant to move this idea into production.'}
                          </div>
                        )}
                      </div>

                      {addingVariantFor === topic.id && (
                        <form
                          onSubmit={(event) => submitVariant(event, topic.id)}
                          className="mt-3 rounded-xl border border-white/[0.1] bg-[#151518] p-3.5"
                        >
                          <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                            <select
                              value={variantChannel}
                              onChange={(event) => setVariantChannel(event.target.value)}
                              className="h-9 rounded-lg border border-white/[0.08] bg-[#1c1c20] px-2.5 text-xs text-zinc-300 outline-none"
                            >
                              {channels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                  {channel.name}
                                </option>
                              ))}
                            </select>
                            <input
                              autoFocus
                              value={variantHook}
                              onChange={(event) => setVariantHook(event.target.value)}
                              placeholder={isZh ? '这一版的 Hook…' : 'Hook for this variant…'}
                              className="h-9 rounded-lg border border-white/[0.08] bg-black/25 px-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-white/20"
                            />
                          </div>
                          <input
                            value={variantAngle}
                            onChange={(event) => setVariantAngle(event.target.value)}
                            placeholder={isZh ? '切入角度（可选）' : 'Angle (optional)'}
                            className="mt-2 h-9 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-white/20"
                          />
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setAddingVariantFor(null)}
                              className="px-3 py-2 text-[11px] text-zinc-500 hover:text-zinc-300"
                            >
                              {isZh ? '取消' : 'Cancel'}
                            </button>
                            <button
                              type="submit"
                              disabled={!variantHook.trim()}
                              className="rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                            >
                              {isZh ? '保存版本' : 'Save variant'}
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="mt-5 flex justify-end border-t border-white/[0.06] pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const confirmed = window.confirm(
                              isZh
                                ? '删除核心选题也会删除它的所有渠道版本，确定继续吗？'
                                : 'Deleting this topic also removes all of its variants. Continue?'
                            );
                            if (confirmed) gtm.deleteTopic(topic.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <TrashIcon />
                          {isZh ? '删除选题' : 'Delete topic'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
