'use client';

/**
 * To-Do 详情页 — 三栏布局
 * 左（layout 提供全局导航）｜中间偏左：当天 To-Do 列表｜中间：渠道专员输出的内容｜最右：与渠道专员的对话区
 *
 * 渠道专员对话上下文以单个 to-do 为界，相互独立。
 * 专员有两套工具：重写当前内容 / 重写该渠道整个 30 天计划。
 */

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useGtm } from '@/lib/gtm/store';
import { callChannelChat, callChannelWrite } from '@/lib/gtm/api-client';
import { getPublishTarget, publishTo } from '@/lib/gtm/publish-links';
import { addDays } from '@/lib/gtm/dates';
import { Markdown } from '@/lib/gtm/markdown';
import type { Todo } from '@/lib/gtm/types';

type MobilePane = 'content' | 'chat';

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
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('content');
  const writeStartedRef = useRef<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const todo = store.todos.find((t) => t.id === id);
  const dayTodos = useMemo(
    () =>
      store.todos
        .filter((t) => t.date === todo?.date)
        .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')),
    [store.todos, todo?.date]
  );
  const chat = store.todoChats[id] ?? [];

  // 首次打开：渠道专员 one-shot 撰写内容
  const startWrite = (target: Todo) => {
    writeStartedRef.current = target.id;
    gtm.updateTodo(target.id, { contentStatus: 'writing' });
    void (async () => {
      try {
        const res = await callChannelWrite({ todo: target, store, locale });
        gtm.updateTodo(target.id, {
          content: { title: res.title, body: res.body },
          contentStatus: 'ready',
        });
      } catch {
        gtm.updateTodo(target.id, { contentStatus: 'none' });
        writeStartedRef.current = null;
      }
    })();
  };

  useEffect(() => {
    if (!todo || todo.contentStatus !== 'none' || writeStartedRef.current === id) return;
    // 先进页面、再异步触发 AI 撰写，避免导航卡顿
    const timer = window.setTimeout(() => {
      if (writeStartedRef.current === id) return;
      startWrite(todo);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo?.contentStatus, id, todo?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length, chatBusy]);

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

  const target = getPublishTarget(todo.channelId);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatInput('');
    setChatBusy(true);
    gtm.addTodoChatMessage(id, { role: 'user', content: text });
    try {
      const res = await callChannelChat({
        todo,
        history: chat,
        message: text,
        store,
        locale,
      });
      gtm.addTodoChatMessage(id, { role: 'assistant', content: res.reply });
      if (res.rewriteContent) {
        gtm.updateTodo(id, {
          content: res.rewriteContent,
          contentStatus: 'ready',
        });
      }
      if (res.rewritePlan && res.rewritePlan.length > 0 && store.startDate) {
        const startDate = store.startDate;
        const channelDoc = store.channelStrategies[todo.channelId];
        const newTodos: Todo[] = res.rewritePlan.map((t, i) => {
          // 当前这条 to-do 保留 id 与已写内容（若日索引仍存在）
          const keepCurrent = t.dayIndex === todo.dayIndex;
          return {
            id: keepCurrent ? todo.id : `${todo.channelId}-${t.dayIndex}-${i}-${Date.now()}`,
            channelId: todo.channelId,
            channelName: channelDoc?.channelName ?? todo.channelName,
            dayIndex: t.dayIndex,
            date: addDays(startDate, t.dayIndex - 1),
            time: t.time,
            title: t.title,
            brief: t.brief,
            phase: t.phase,
            market: t.market ?? todo.market,
            audience: t.audience ?? todo.audience,
            status: keepCurrent ? todo.status : 'pending',
            content: keepCurrent ? todo.content : undefined,
            contentStatus: keepCurrent ? todo.contentStatus : 'none',
          };
        });
        gtm.replaceChannelTodos(todo.channelId, newTodos);
      }
    } catch (err) {
      gtm.addTodoChatMessage(id, {
        role: 'assistant',
        content: isZh
          ? `抱歉，出了点问题（${err instanceof Error ? err.message : '未知错误'}），再试一次？`
          : `Something went wrong (${err instanceof Error ? err.message : 'unknown'}). Try again?`,
      });
    } finally {
      setChatBusy(false);
    }
  };

  // 注意：打开发布页 ≠ 任务完成。是否完成由用户点「标记完成」自行决定。
  const handlePublish = async () => {
    const text = todo.content ? `${todo.content.title}\n\n${todo.content.body}` : '';
    const ok = await publishTo(todo.channelId, text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
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
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
              {todo.content.title}
            </h2>
            <div className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.85] text-ink-soft">
              {todo.content.body}
            </div>
          </article>
        )}
        {todo.contentStatus === 'none' && (
          <div className="flex h-full items-center justify-center">
            <button
              onClick={() => startWrite(todo)}
              className="rounded-full bg-paper-dim px-5 py-2.5 text-sm text-ink-soft hover:bg-zinc-200"
            >
              {isZh ? '内容生成失败，点击重试' : 'Failed to write. Retry'}
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 rounded-2xl bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePublish}
            disabled={todo.contentStatus !== 'ready'}
            className="flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {isZh ? `发布 · ${target.label}` : `Publish · ${target.labelEn}`}
          </button>
          <button
            onClick={() =>
              gtm.updateTodo(id, {
                status: todo.status === 'done' ? 'pending' : 'done',
              })
            }
            className="flex h-10 items-center rounded-full bg-paper-dim px-4 text-sm text-ink-soft transition-colors hover:bg-zinc-200"
          >
            {todo.status === 'done'
              ? isZh ? '已完成 ✓' : 'Done ✓'
              : isZh ? '标记完成' : 'Mark done'}
          </button>
          {copied && (
            <span className="animate-fade-in text-xs text-zinc-400">
              {isZh ? '内容已复制到剪贴板，直接粘贴即可' : 'Copied — just paste it'}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          {target.prefills
            ? isZh ? '内容会自动带入发布框。' : 'Content will be prefilled. '
            : isZh ? '该渠道不支持自动带入，内容已复制，粘贴即可发布。' : "This channel can't prefill — content is copied for pasting. "}
          {isZh
            ? '打开发布页不代表任务完成 — 真正发出去之后，回来点「标记完成」。'
            : 'Opening the publisher doesn’t complete the task — after you actually post, come back and mark it done.'}
        </p>
      </div>
    </div>
  );

  const chatPane = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="shrink-0 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <p className="index-label">{isZh ? `${todo.channelName} 渠道专员` : `${todo.channelName} Specialist`}</p>
        <p className="mt-0.5 text-[11px] text-zinc-400">
          {isZh ? '对话仅针对这条 To-Do · 可改内容，也可重排整渠道计划' : 'Scoped to this to-do · revise copy or replan the channel'}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        {chat.length === 0 && (
          <div className="rounded-2xl bg-paper-dim p-4">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              {isZh
                ? '内容哪里不对味？直接告诉我，比如「太官方了」「开头太啰嗦」「换个角度写」。想调整这个渠道整个 30 天的方向也可以说。'
                : 'Tell me what feels off — “too formal”, “boring opener”, “different angle”. You can also ask me to replan the whole 30 days for this channel.'}
            </p>
          </div>
        )}
        {chat.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[88%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-white'
                  : 'max-w-[88%] rounded-2xl rounded-bl-md bg-paper-dim px-3.5 py-2.5 text-[13px] leading-relaxed text-ink'
              }
            >
              <Markdown
                text={m.content}
                className={`doc-prose !text-inherit text-[13px] [&_p]:m-0 [&_p+p]:mt-2 ${
                  m.role === 'user' ? 'doc-prose-invert' : ''
                }`}
              />
            </div>
          </div>
        ))}
        {chatBusy && (
          <span className="index-label animate-pulse-soft">
            {isZh ? '专员正在处理…' : 'Working on it…'}
          </span>
        )}
        <div ref={chatBottomRef} />
      </div>
      <div className="shrink-0 rounded-2xl bg-white p-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-end gap-2">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void sendChat();
              }
            }}
            rows={2}
            placeholder={isZh ? '和渠道专员说说你的想法…' : 'Tell the specialist…'}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-paper-dim px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <button
            onClick={() => void sendChat()}
            disabled={chatBusy || !chatInput.trim()}
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-ink text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200"
            aria-label="send"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
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
        <div className="flex rounded-full bg-paper-dim p-0.5 lg:hidden">
          {(['content', 'chat'] as MobilePane[]).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePane(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                mobilePane === p ? 'bg-ink text-white' : 'text-ink-muted'
              }`}
            >
              {p === 'content' ? (isZh ? '内容' : 'Content') : isZh ? '对话' : 'Chat'}
            </button>
          ))}
        </div>
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

        <div className={`min-w-0 flex-1 flex-col ${mobilePane === 'content' ? 'flex' : 'hidden'} lg:flex`}>
          {contentPane}
        </div>

        <div
          className={`w-full flex-col lg:w-[360px] lg:shrink-0 ${
            mobilePane === 'chat' ? 'flex' : 'hidden'
          } lg:flex`}
        >
          {chatPane}
        </div>
      </div>
    </div>
  );
}
