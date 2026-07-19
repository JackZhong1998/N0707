'use client';

/**
 * To-Do 详情页只负责左侧执行工作区：任务、内容、发布和数据。
 * 所有讨论与修改指令统一交给 AppShell 右侧常驻的市场合伙人；
 * 页面通过 ViewContext 把当前 To-Do 的精确上下文传给主 Agent。
 */

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { publishTo } from '@/lib/gtm/publish-links';
import PostMetricsPanel from '@/components/app/PostMetricsPanel';
import { useViewContext } from '@/lib/gtm/view-context-provider';

const PUBLISH_HOSTS: Record<string, string[]> = {
  xiaohongshu: ['xiaohongshu.com', 'xhslink.com'],
  twitter_x: ['x.com', 'twitter.com'],
  linkedin: ['linkedin.com', 'lnkd.in'],
  reddit: ['reddit.com', 'redd.it'],
  wechat_official: ['mp.weixin.qq.com'],
  product_hunt: ['producthunt.com'],
  github_growth: ['github.com'],
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const gtm = useGtm();
  const { store, hydrated } = gtm;
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [copied, setCopied] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const writeRequestedRef = useRef<string | null>(null);
  const { setViewContext, clearViewContext } = useViewContext();

  const todo = store.todos.find((t) => t.id === id);
  const dayTodos = useMemo(
    () =>
      store.todos
        .filter((t) => t.date === todo?.date)
        .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')),
    [store.todos, todo?.date]
  );

  const requestWrite = () => {
    writeRequestedRef.current = id;
    window.dispatchEvent(
      new CustomEvent('nowbuild:write-todo', {
        detail: { todoId: id },
      })
    );
  };

  useEffect(() => {
    if (
      !hydrated ||
      !store.paid ||
      !todo ||
      !['none', 'writing'].includes(todo.contentStatus) ||
      writeRequestedRef.current === id
    ) {
      return;
    }
    // Content generation is dispatched into the same durable Agent job queue
    // as every other mutation, so a refresh can resume it safely.
    const timer = window.setTimeout(() => {
      if (writeRequestedRef.current === id) return;
      requestWrite();
    }, 150);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, store.paid, todo?.contentStatus, id, todo?.id]);

  useEffect(() => {
    if (!todo) return;
    setViewContext({
      view: 'todo_detail',
      entityType: 'todo',
      entityId: todo.id,
      title: todo.content?.title || todo.title,
      channelId: todo.channelId,
      revision: todo.contentStatus === 'ready' ? todo.content?.body.length ?? 0 : 0,
    });
    return clearViewContext;
  }, [
    clearViewContext,
    setViewContext,
    todo,
  ]);

  if (!todo && !hydrated) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center px-4 py-2.5 sm:px-5">
          <Link
            href="/app/calendar"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-ink"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {isZh ? '返回日历' : 'Back to calendar'}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="index-label animate-pulse-soft">{isZh ? '加载中…' : 'Loading…'}</span>
        </div>
      </div>
    );
  }

  if (!todo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-zinc-400">{isZh ? '找不到这条任务' : 'Task not found'}</p>
        <Link href="/app/calendar" className="text-sm font-medium text-ink underline">
          {isZh ? '返回日历' : 'Back to calendar'}
        </Link>
      </div>
    );
  }

  const getContentText = () => {
    if (!todo.content) return '';
    return `${todo.content.title}\n\n${todo.content.body}`;
  };

  const handleCopyContent = async () => {
    const text = getContentText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts; ignore quietly.
    }
  };

  const recordPublished = (postUrl: string) => {
    const expectedHosts = PUBLISH_HOSTS[todo.channelId];
    const pastedUrl = postUrl.trim().match(/https?:\/\/[^\s]+/)?.[0] ?? postUrl.trim();
    const normalizedUrl = pastedUrl.replace(/[),.;，。；）]+$/, '');
    let valid = false;
    try {
      const url = new URL(normalizedUrl);
      valid =
        ['http:', 'https:'].includes(url.protocol) &&
        (!expectedHosts ||
          expectedHosts.some(
            (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
          ));
    } catch {
      valid = false;
    }
    if (!valid) {
      setUrlError(
        isZh ? '请输入该渠道的有效帖子地址。' : 'Enter a valid post URL for this channel.'
      );
      return false;
    }
    gtm.updateTodo(id, {
      status: 'done',
      publishStatus: 'published',
      publishedUrl: normalizedUrl,
      publishedAt: Date.now(),
      publishError: undefined,
      trackingStatus: 'active',
      metricSnapshots: todo.metricSnapshots ?? [],
    });
    setUrlError('');
    setManualUrl('');
    return true;
  };

  const handlePublish = async () => {
    if (!todo.content) return;
    const text = getContentText();
    await publishTo(todo.channelId, text);
    gtm.updateTodo(id, {
      publishStatus: 'needs_user_action',
      publishError: undefined,
    });
  };

  const contentPane = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="shrink-0 rounded-2xl bg-white p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-paper-dim px-2.5 py-0.5 text-[11px] font-medium text-ink">
            {todo.channelName}
          </span>
          <span className="index-label">
            Day {todo.dayIndex}
            {todo.phase ? ` · ${todo.phase}` : ''}
          </span>
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-ink">
          {todo.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{todo.brief}</p>
        {(todo.market || todo.audience) && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {todo.market && (
              <span className="rounded-full bg-paper-dim px-2.5 py-0.5 text-[11px] text-ink-soft">
                {isZh ? '目标市场：' : 'Market: '}
                {todo.market}
              </span>
            )}
            {todo.audience && (
              <span className="rounded-full bg-paper-dim px-2.5 py-0.5 text-[11px] text-ink-soft">
                {isZh ? '目标人群：' : 'Audience: '}
                {todo.audience}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        {todo.contentStatus === 'writing' && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-ink" />
            </span>
            <p className="text-sm text-zinc-400">
              {isZh ? '渠道专员正在为你撰写内容…' : 'Your specialist is writing…'}
            </p>
          </div>
        )}
        {todo.contentStatus === 'ready' && todo.content && (
          <article>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
                {todo.content.title}
              </h2>
              <button
                type="button"
                onClick={() => void handleCopyContent()}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-paper-dim px-3 text-xs font-medium text-ink transition-colors hover:bg-zinc-200"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
                {copied ? (isZh ? '已复制' : 'Copied') : isZh ? '复制' : 'Copy'}
              </button>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.85] text-ink-soft">
              {todo.content.body}
            </div>
          </article>
        )}
        {todo.contentStatus === 'none' && (
          <div className="flex h-full items-center justify-center">
            <button
              onClick={requestWrite}
              className="rounded-full bg-paper-dim px-5 py-2.5 text-sm text-ink-soft hover:bg-zinc-200"
            >
              {isZh ? '内容生成失败，点击重试' : 'Failed to write. Retry'}
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 rounded-2xl bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        {todo.publishedUrl ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {isZh ? '已发布并记录帖子' : 'Published and saved'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {todo.publishedAt
                    ? new Date(todo.publishedAt).toLocaleString(isZh ? 'zh-CN' : 'en-US')
                    : ''}
                </p>
              </div>
              <a
                href={todo.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                {isZh ? '查看原帖' : 'View post'}
              </a>
            </div>
            <p className="mt-2 truncate text-[11px] text-zinc-400">{todo.publishedUrl}</p>
            <div className="border-t border-zinc-100 pt-4">
              <PostMetricsPanel
                todo={todo}
                onSnapshot={(snapshot) =>
                  gtm.updateTodo(id, {
                    trackingStatus: 'active',
                    metricSnapshots: [...(todo.metricSnapshots ?? []), snapshot],
                  })
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={todo.contentStatus !== 'ready'}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 sm:w-auto"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {isZh ? `前往${todo.channelName}发布` : `Open ${todo.channelName} to publish`}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={manualUrl}
                onChange={(event) => {
                  setManualUrl(event.target.value);
                  setUrlError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && manualUrl.trim()) {
                    recordPublished(manualUrl);
                  }
                }}
                placeholder={
                  isZh ? `粘贴${todo.channelName}帖子链接` : `Paste the ${todo.channelName} post URL`
                }
                className="h-10 min-w-0 flex-1 rounded-full bg-paper-dim px-4 text-xs text-ink outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <button
                type="button"
                onClick={() => recordPublished(manualUrl)}
                disabled={!manualUrl.trim()}
                className="h-10 rounded-full bg-paper-dim px-4 text-xs font-medium text-ink disabled:text-zinc-300"
              >
                {isZh ? '确认已发布' : 'Confirm published'}
              </button>
            </div>
            {urlError && <p className="text-xs text-red-500">{urlError}</p>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-3 bg-paper-dim p-3">
      <div className="flex shrink-0 items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-[0_1px_8px_rgba(0,0,0,0.04)] sm:px-5">
        <Link
          href="/app/calendar"
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-ink"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {isZh ? '返回日历' : 'Back to calendar'}
        </Link>
        <span className="text-[10px] text-zinc-400">
          {isZh ? '在右侧与市场合伙人讨论当前内容' : 'Discuss this content with your partner on the right'}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <aside className="hidden w-60 shrink-0 flex-col gap-2 lg:flex">
          <div className="shrink-0 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <p className="index-label">{isZh ? '当天任务' : "Today's tasks"}</p>
            <p className="mt-0.5 font-mono text-xs text-zinc-400">{todo.date}</p>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            {dayTodos.map((t) => (
              <Link
                key={t.id}
                href={`/app/calendar/task/${t.id}`}
                className={`block rounded-xl p-3 transition-colors ${
                  t.id === id ? 'bg-paper-dim' : 'hover:bg-paper-dim/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    {t.channelName}
                  </span>
                  {t.time && <span className="font-mono text-[10px] text-zinc-300">{t.time}</span>}
                </div>
                <p
                  className={`mt-1 text-[12.5px] font-medium leading-snug ${
                    t.status === 'done' ? 'text-zinc-300 line-through' : 'text-ink'
                  }`}
                >
                  {t.title}
                </p>
              </Link>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {contentPane}
        </div>
      </div>
    </div>
  );
}
