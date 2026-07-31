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
import { Markdown } from '@/lib/gtm/markdown';
import { publishTo } from '@/lib/gtm/publish-links';
import PostMetricsPanel from '@/components/app/PostMetricsPanel';
import { useViewContext } from '@/lib/gtm/view-context-provider';
import {
  detectPublisherExtension,
  publishWithExtension,
  type PublisherEvent,
  type PublisherAvailability,
  type SupportedPublishChannel,
} from '@/lib/gtm/publisher-extension';
import {
  canPublishTodo,
  capabilityLabels,
  getChannelCapability,
  validatePostUrl,
} from '@/lib/gtm/channel-capabilities';
import type { PublishStatus } from '@/lib/gtm/types';

function publishStatusLabel(status: PublishStatus | undefined, isZh: boolean) {
  const labels: Record<PublishStatus, [string, string]> = {
    not_started: ['尚未开始', 'Not started'],
    opening: ['正在打开平台', 'Opening platform'],
    filling: ['正在自动填写', 'Auto-filling'],
    needs_user_action: ['填写完成，待你发布', 'Ready for you to publish'],
    awaiting_user: ['填写完成，待你发布', 'Ready for you to publish'],
    waiting_login: ['等待平台登录', 'Waiting for platform login'],
    publishing: ['正在检测发布结果', 'Detecting publish result'],
    published_needs_link: ['已发布，待补链接', 'Published, URL needed'],
    published: ['已发布，待确认链接', 'Published, confirming URL'],
    tracked: ['已发布并追踪', 'Published and tracked'],
    blocked: ['发布需要处理', 'Publishing needs attention'],
    failed: ['发布检测失败', 'Publish detection failed'],
  };
  const pair = labels[status ?? 'not_started'];
  return isZh ? pair[0] : pair[1];
}

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
  const [dayTodosOpen, setDayTodosOpen] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [publisher, setPublisher] = useState<PublisherAvailability | null>(null);
  const [confirmUrl, setConfirmUrl] = useState('');
  const writeRequestedRef = useRef<string | null>(null);
  const { setViewContext, clearViewContext } = useViewContext();

  const todo = store.todos.find((t) => t.id === id);
  const capability = getChannelCapability(todo?.channelId ?? '');
  const showPublishButton = todo ? canPublishTodo(todo) : false;
  const extensionCanFill =
    publisher?.installed === true &&
    publisher.supportedChannels.includes(todo?.channelId ?? '');
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

  useEffect(() => {
    setManualUrl(todo?.publishedUrl ?? '');
    setUrlError('');
    setConfirmUrl('');
  }, [todo?.id, todo?.publishedUrl]);

  useEffect(() => {
    let cancelled = false;
    void detectPublisherExtension().then((availability) => {
      if (!cancelled) setPublisher(availability);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    const validation = validatePostUrl(todo.channelId, postUrl);
    if (validation.confidence === 'invalid') {
      setUrlError(
        isZh
          ? '这不是该渠道的有效原帖地址，请打开帖子详情页后重新复制。'
          : 'This is not a valid post URL for this channel. Open the post itself and copy that URL.'
      );
      setConfirmUrl('');
      return false;
    }
    if (
      validation.confidence === 'low' &&
      confirmUrl !== validation.url
    ) {
      setConfirmUrl(validation.url);
      setUrlError(
        isZh
          ? '域名正确，但地址不像公开帖子详情页。确认已打开原帖后，再点击一次“仍要保存”。'
          : 'The domain is correct, but this does not look like a public post page. Verify the post and choose “Save anyway”.'
      );
      return false;
    }
    gtm.updateTodo(id, {
      status: 'done',
      launchStatus: 'published',
      publishStatus: 'tracked',
      publishedUrl: validation.url,
      linkStatus: 'confirmed',
      publishedAt: todo.publishedAt ?? Date.now(),
      publishError: undefined,
      trackingStatus: 'active',
      metricSnapshots: todo.metricSnapshots ?? [],
    });
    setUrlError('');
    setConfirmUrl('');
    setManualUrl(validation.url);
    setPublishMessage(isZh ? '帖子链接已保存，可随时修改。' : 'Post URL saved. You can change it anytime.');
    return true;
  };

  const markLinkForLater = () => {
    gtm.updateTodo(id, {
      status: 'done',
      launchStatus: 'published',
      publishStatus: 'published_needs_link',
      linkStatus: 'pending',
      publishedAt: todo.publishedAt ?? Date.now(),
      trackingStatus: 'needs_user',
      publishError: undefined,
    });
    setPublishMessage(
      isZh
        ? `已将发布任务标记完成，并保留“待补链接”提醒。${capability.linkHelp.zh}`
        : `The publishing task is complete and remains flagged “Post URL needed.” ${capability.linkHelp.en}`
    );
  };

  const undoContentRewrite = () => {
    const previous = todo.contentHistory?.at(-1);
    if (!previous) return;
    gtm.updateTodo(id, {
      content: previous.content,
      contentStatus: 'ready',
      contentRevision: (todo.contentRevision ?? previous.version) + 1,
      contentHistory: todo.contentHistory?.slice(0, -1) ?? [],
    });
    setPublishMessage(
      isZh
        ? `已恢复修改前的文案（原 v${previous.version}）。`
        : `Restored the copy from before the last rewrite (original v${previous.version}).`
    );
  };

  const handlePublish = async () => {
    if (!todo.content || !showPublishButton) return;
    const text = getContentText();
    setPublishing(true);
    setPublishMessage(isZh ? '正在连接发布插件…' : 'Connecting to the publisher…');

    const latestPublisher = publisher ?? (await detectPublisherExtension());
    setPublisher(latestPublisher);
    if (
      latestPublisher.installed &&
      latestPublisher.supportedChannels.includes(todo.channelId)
    ) {
      const task = publishWithExtension(
        todo.channelId as SupportedPublishChannel,
        {
          title: todo.content.title,
          body: todo.content.body,
        },
        (event: PublisherEvent) => {
          setPublishMessage(event.message || '');
          gtm.updateTodo(id, {
            publishStatus: event.status,
            publishError: event.error,
          });
          if (event.postUrl) setManualUrl(event.postUrl);
        }
      );
      try {
        const result = await task.completion;
        const detected = result.postUrl
          ? validatePostUrl(todo.channelId, result.postUrl)
          : null;
        if (detected?.confidence === 'high') {
          gtm.updateTodo(id, {
            status: 'done',
            launchStatus: 'published',
            publishStatus: 'tracked',
            publishedUrl: detected.url,
            linkStatus: 'confirmed',
            publishedAt: todo.publishedAt ?? Date.now(),
            publishError: undefined,
            trackingStatus: 'active',
            metricSnapshots: todo.metricSnapshots ?? [],
          });
          setManualUrl(detected.url);
          setPublishMessage(
            isZh
              ? '发布成功，已自动保存原帖链接并开始追踪。'
              : 'Published. The post URL was saved and tracking is active.'
          );
          gtm.addAgentNotification({
            title: isZh ? `${todo.channelName} 发布成功` : `${todo.channelName} published`,
            summary: isZh
              ? '已自动保存原帖链接并开始追踪。'
              : 'The post URL was saved and tracking is active.',
            priority: 'normal',
          });
        } else {
          if (result.postUrl) setManualUrl(result.postUrl);
          gtm.updateTodo(id, {
            status: 'done',
            launchStatus: 'published',
            publishStatus: 'published_needs_link',
            linkStatus: 'pending',
            publishedAt: todo.publishedAt ?? Date.now(),
            publishError: undefined,
            trackingStatus: 'needs_user',
          });
          setPublishMessage(
            isZh
              ? `平台已确认发布，但尚未获得可信原帖链接。${capability.linkHelp.zh}`
              : `Publishing was confirmed, but a trustworthy post URL was not found. ${capability.linkHelp.en}`
          );
          gtm.addAgentNotification({
            title: isZh
              ? `${todo.channelName} 已发布，待补链接`
              : `${todo.channelName} published — URL needed`,
            summary: isZh ? capability.linkHelp.zh : capability.linkHelp.en,
            priority: 'important',
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : isZh ? '发布未完成' : 'Publishing did not finish';
        gtm.updateTodo(id, { publishStatus: 'failed', publishError: message });
        setPublishMessage(message);
        gtm.addAgentNotification({
          title: isZh
            ? `${todo.channelName} 发布检测未完成`
            : `${todo.channelName} publish detection did not finish`,
          summary: message,
          priority: 'important',
        });
      } finally {
        setPublishing(false);
      }
      return;
    }

    try {
      await publishTo(todo.channelId, text);
      gtm.updateTodo(id, {
        publishStatus: 'needs_user_action',
        publishError: undefined,
      });
      setPublishMessage(
        latestPublisher.installed
          ? isZh
            ? '该渠道暂不支持插件填写，已打开平台并复制文案。发布后请返回此任务确认。'
            : 'This channel is not supported by the extension. The platform is open and the copy is ready; return here after publishing.'
          : isZh
            ? '未检测到插件，已打开平台并复制文案。发布后请返回此任务确认。'
            : 'Publisher not detected. The platform is open and the copy is ready; return here after publishing.'
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isZh
            ? '无法打开发布平台'
            : 'Could not open the publishing platform';
      gtm.updateTodo(id, { publishStatus: 'failed', publishError: message });
      setPublishMessage(message);
    } finally {
      setPublishing(false);
    }
  };

  const contentPane = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025]">
       <section className="p-5">
        <p className="index-label mb-3">{isZh ? '为什么安排这项任务' : 'Why this task'}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-ink">
            {todo.channelName}
          </span>
          <span className="index-label">
            Day {todo.dayIndex}
            {todo.phase ? ` · ${todo.phase}` : ''}
          </span>
          {todo.launchStatus && (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] uppercase text-zinc-500">
              {todo.launchStatus.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {capabilityLabels(capability, isZh).map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-zinc-400"
            >
              {label}
            </span>
          ))}
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-ink">
          {todo.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{todo.purpose || todo.brief}</p>
        {(todo.pillar || todo.taskType) && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {todo.pillar && (
              <div className="rounded-xl bg-white/[0.04] p-3">
                <span className="index-label">{isZh ? 'Campaign 支柱' : 'Campaign pillar'}</span>
                <p className="mt-1 text-xs text-ink-soft">{todo.pillar}</p>
              </div>
            )}
            {todo.taskType && (
              <div className="rounded-xl bg-white/[0.04] p-3">
                <span className="index-label">{isZh ? '交付类型' : 'Deliverable type'}</span>
                <p className="mt-1 text-xs capitalize text-ink-soft">{todo.taskType}</p>
              </div>
            )}
          </div>
        )}
        {todo.purpose && <p className="mt-3 text-xs leading-5 text-zinc-400">{todo.brief}</p>}
        {(todo.market || todo.audience) && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {todo.market && (
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-ink-soft">
                {isZh ? '目标市场：' : 'Market: '}
                {todo.market}
              </span>
            )}
            {todo.audience && (
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-ink-soft">
                {isZh ? '目标人群：' : 'Audience: '}
                {todo.audience}
              </span>
            )}
          </div>
        )}
       </section>

      <section className="border-t border-white/[0.06] p-5">
        <p className="index-label mb-4">{isZh ? '发布文案' : 'Publishing copy'}</p>
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
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
                  {todo.content.title}
                </h2>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {isZh ? '内容版本' : 'Copy version'} v{todo.contentRevision ?? 1}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {(todo.contentHistory?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={undoContentRewrite}
                    className="flex h-8 items-center rounded-full border border-white/[0.1] px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-white/[0.06]"
                  >
                    {isZh ? '撤销本次修改' : 'Undo rewrite'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleCopyContent()}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-xs font-medium text-ink transition-colors hover:bg-white/[0.1]"
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
            </div>
            <Markdown
              text={todo.content.body}
              breaks
              className="doc-prose mt-4 max-w-none break-words !text-[15px] !leading-[1.85]"
            />
          </article>
        )}
        {todo.contentStatus === 'none' && (
          <div className="flex h-full items-center justify-center">
            <button
              onClick={requestWrite}
              className="rounded-full bg-white/[0.06] px-5 py-2.5 text-sm text-ink-soft hover:bg-white/[0.1]"
            >
              {isZh ? '内容生成失败，点击重试' : 'Failed to write. Retry'}
            </button>
          </div>
        )}
      </section>

      <section className="border-t border-white/[0.06] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="index-label">{isZh ? '发布状态' : 'Publishing status'}</p>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-ink-soft">
            {publishStatusLabel(
              todo.publishedUrl ? 'tracked' : todo.publishStatus,
              isZh
            )}
          </span>
        </div>
          <div className="space-y-4">
            {todo.linkStatus === 'pending' && !todo.publishedUrl && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  {isZh ? '已发布 · 待补原帖链接' : 'Published · Post URL needed'}
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  {isZh ? capability.linkHelp.zh : capability.linkHelp.en}
                </p>
              </div>
            )}
            {todo.publishedUrl && (
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
            )}
            {showPublishButton ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={publishing}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 sm:w-auto"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  {publishing
                    ? isZh
                      ? '发布处理中…'
                      : 'Publishing…'
                    : isZh
                      ? `准备发布到${todo.channelName}`
                      : `Prepare for ${todo.channelName}`}
                </button>
                {extensionCanFill ? (
                  <span className="text-[11px] text-zinc-400">
                    {isZh
                      ? '插件自动化填写，最终发布由你确认'
                      : 'The extension fills it; you confirm the final publish'}
                  </span>
                ) : capability.extensionSupport !== 'none' ? (
                  <Link
                    href={`/app/publisher-extension?returnTo=${encodeURIComponent(`/app/calendar/task/${id}`)}`}
                    className="text-[11px] font-medium text-ink underline underline-offset-2"
                  >
                    {isZh ? '安装发布插件并返回当前任务' : 'Install publisher and return here'}
                  </Link>
                ) : (
                  <span className="text-[11px] text-zinc-400">
                    {isZh
                      ? '复制文案并打开平台，最终发布由你确认'
                      : 'Copies the text and opens the platform; you confirm publishing'}
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-xs font-medium text-ink-soft">
                  {isZh ? '此任务不显示内容发布按钮' : 'No content-publishing button for this task'}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                  {isZh ? capability.linkHelp.zh : capability.linkHelp.en}
                </p>
              </div>
            )}

            {capability.publishAction !== 'none' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={manualUrl}
                onChange={(event) => {
                  setManualUrl(event.target.value);
                  setUrlError('');
                  setConfirmUrl('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && manualUrl.trim()) {
                    recordPublished(manualUrl);
                  }
                }}
                placeholder={
                  isZh ? `粘贴${todo.channelName}帖子链接` : `Paste the ${todo.channelName} post URL`
                }
                className="h-10 min-w-0 flex-1 rounded-full bg-white/[0.06] px-4 text-xs text-ink outline-none focus:ring-2 focus:ring-white/10"
              />
              <button
                type="button"
                onClick={() => recordPublished(manualUrl)}
                disabled={!manualUrl.trim()}
                className="h-10 rounded-full bg-white/[0.06] px-4 text-xs font-medium text-ink disabled:text-zinc-600"
              >
                {confirmUrl
                  ? isZh
                    ? '仍要保存'
                    : 'Save anyway'
                  : todo.publishedUrl
                    ? isZh
                      ? '更新链接'
                      : 'Update URL'
                    : isZh
                      ? '保存链接'
                      : 'Save URL'}
              </button>
            </div>
            )}
            {!todo.publishedUrl &&
              ['needs_user_action', 'awaiting_user', 'publishing', 'published_needs_link', 'published'].includes(
                todo.publishStatus ?? ''
              ) && (
                <button
                  type="button"
                  onClick={markLinkForLater}
                  className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-ink"
                >
                  {isZh ? '我已发布，链接稍后补充' : 'I published it — add the URL later'}
                </button>
              )}
            {urlError && <p className="text-xs text-red-500">{urlError}</p>}
            {publishMessage && !urlError && (
              <p className="text-xs text-zinc-400">{publishMessage}</p>
            )}
            {todo.publishedUrl && (
              <div className="border-t border-white/[0.06] pt-4">
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
            )}
          </div>
      </section>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex shrink-0 items-center justify-between gap-3 px-1">
        <Link
          href="/app/calendar"
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-ink"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {isZh ? '返回日历' : 'Back to calendar'}
        </Link>
        <span className="text-[10px] text-zinc-500">
          {isZh ? '在右侧与冷启动合伙人讨论当前内容' : 'Discuss this content with your Launch Partner on the right'}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <aside className={`hidden shrink-0 lg:block ${dayTodosOpen ? 'w-60' : 'w-4'}`}>
          {dayTodosOpen ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <button
                type="button"
                onClick={() => setDayTodosOpen(false)}
                aria-expanded
                className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 text-left"
              >
                <p className="font-mono text-xs text-zinc-400">{todo.date}</p>
                <span className="text-zinc-500">‹</span>
              </button>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
                {dayTodos.map((t) => (
                  <Link
                    key={t.id}
                    href={`/app/calendar/task/${t.id}`}
                    className={`block rounded-xl p-3 transition-colors ${
                      t.id === id
                        ? 'border border-white/20 bg-white/[0.045]'
                        : 'border border-transparent hover:border-white/20 hover:bg-white/[0.045]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        {t.channelName}
                      </span>
                      {t.time && <span className="font-mono text-[10px] text-zinc-500">{t.time}</span>}
                    </div>
                    <p
                      className={`mt-1 text-[12.5px] font-medium leading-snug ${
                        t.status === 'done' ? 'text-zinc-500 line-through' : 'text-ink'
                      }`}
                    >
                      {t.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDayTodosOpen(true)}
              aria-expanded={false}
              aria-label={isZh ? '展开当天任务' : "Expand today's tasks"}
              className="group flex w-full flex-col items-stretch gap-[5px] py-1"
            >
              {(dayTodos.length > 0 ? dayTodos : [null, null, null]).map((t, index) => (
                <span
                  key={t?.id ?? `bar-${index}`}
                  className={`block h-1.5 w-full rounded-full transition-opacity group-hover:opacity-100 ${
                    t && t.id === id
                      ? 'bg-white opacity-100'
                      : t?.status === 'done'
                        ? 'bg-white/40 opacity-70'
                        : 'bg-white/70 opacity-80'
                  }`}
                />
              ))}
            </button>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {contentPane}
        </div>
      </div>
    </div>
  );
}
