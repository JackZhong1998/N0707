'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import KickoffCardView from '@/components/app/chat/KickoffCardView';
import OptionCardView from '@/components/app/chat/OptionCardView';
import { Markdown } from '@/lib/gtm/markdown';
import ArtifactLibraryDrawer, {
  ArtifactLibraryTrigger,
} from '@/components/app/ArtifactLibraryDrawer';
import type {
  AgentArtifact,
  KickoffCard,
  MessageCard,
  OptionCard,
} from '@/lib/gtm/types';
import type { ViewContext } from '@/lib/gtm/view-context';

export type AgentPanelMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  replyToMessageIds?: string[];
  card?: MessageCard;
  artifact?: {
    label: string;
    status?: 'running' | 'waiting' | 'done' | 'error';
    href?: string;
  };
};

export type AgentPanelNotification = {
  id: string;
  title: string;
  summary: string;
  href?: string;
  priority: 'normal' | 'important' | 'blocking';
};

export type AgentPanelViewProps = {
  messages: readonly AgentPanelMessage[];
  artifacts?: readonly AgentArtifact[];
  notifications?: readonly AgentPanelNotification[];
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
  onSubmitOptions?: (
    messageId: string,
    card: OptionCard,
    selected: string[],
    customText?: string
  ) => void;
  onSubmitKickoff?: (
    messageId: string,
    card: KickoffCard,
    answers: Record<string, string[]>
  ) => void;
  onReadNotification?: (notificationId: string) => void;
  sending?: boolean;
  busy?: boolean;
  pendingCount?: number;
  viewContext?: ViewContext | null;
  onClearViewContext?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  isZh?: boolean;
  className?: string;
};

function SparkIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.75c.42 4.97 3.28 7.83 8.25 8.25-4.97.42-7.83 3.28-8.25 8.25C11.58 14.28 8.72 11.42 3.75 11 8.72 10.58 11.58 7.72 12 2.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12 3.27 3.13A59.8 59.8 0 0 1 21.49 12 59.8 59.8 0 0 1 3.27 20.87L6 12Zm0 0h7.5"
      />
    </svg>
  );
}

function ContextLabel({
  context,
  isZh,
}: {
  context: ViewContext;
  isZh: boolean;
}) {
  const detail = context.title || context.entityType || context.view;
  return (
    <>
      <span className="shrink-0 text-zinc-500">
        {isZh ? '正在查看' : 'Viewing'}
      </span>
      <span className="truncate text-zinc-200">{detail}</span>
      {context.channelId && (
        <span className="shrink-0 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
          {context.channelId}
        </span>
      )}
    </>
  );
}

function InteractiveMessageCard({
  messageId,
  card,
  onSubmitOptions,
  onSubmitKickoff,
}: {
  messageId: string;
  card: MessageCard;
  onSubmitOptions?: AgentPanelViewProps['onSubmitOptions'];
  onSubmitKickoff?: AgentPanelViewProps['onSubmitKickoff'];
}) {
  if (card.kind === 'kickoff' && onSubmitKickoff) {
    const kickoffCard = card.card;
    return (
      <KickoffCardView
        card={kickoffCard}
        disabled={false}
        onSubmit={(answers) =>
          onSubmitKickoff(messageId, kickoffCard, answers)
        }
      />
    );
  }
  if (card.kind === 'options' && onSubmitOptions) {
    const optionCard = card.card;
    return (
      <OptionCardView
        card={optionCard}
        disabled={false}
        onSubmit={(selected, customText) =>
          onSubmitOptions(messageId, optionCard, selected, customText)
        }
      />
    );
  }
  return null;
}

export default function AgentPanelView({
  messages,
  artifacts = [],
  notifications = [],
  input,
  onInput,
  onSend,
  onSubmitOptions,
  onSubmitKickoff,
  onReadNotification,
  sending = false,
  busy = false,
  pendingCount = 0,
  viewContext,
  onClearViewContext,
  collapsed = false,
  onToggleCollapsed,
  isZh = true,
  className = '',
}: AgentPanelViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [artifactDrawerOpen, setArtifactDrawerOpen] = useState(false);

  useEffect(() => {
    const latest = messages.at(-1);
    const newMessageCount = Math.max(
      0,
      messages.length - previousMessageCountRef.current
    );
    const userJustSent =
      newMessageCount > 0 && latest?.role === 'user';
    if (stickToBottomRef.current || userJustSent) {
      bottomRef.current?.scrollIntoView({
        behavior:
          previousMessageCountRef.current === 0 ? 'auto' : 'smooth',
        block: 'end',
      });
      stickToBottomRef.current = true;
      setUnseenCount(0);
    } else if (newMessageCount > 0) {
      setUnseenCount((count) => count + newMessageCount);
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  if (collapsed) {
    return (
      <aside
        className={`flex h-full w-14 shrink-0 flex-col items-center rounded-2xl border border-white/[0.08] bg-[#101114]/95 py-3 text-white shadow-2xl backdrop-blur-xl ${className}`}
        aria-label={isZh ? '市场合伙人（已收起）' : 'Marketing partner (collapsed)'}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={isZh ? '展开 Agent' : 'Expand agent'}
        >
          <SparkIcon />
        </button>
        <div className="my-3 h-px w-5 bg-white/10" />
        <span className="[writing-mode:vertical-rl] text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
          {isZh ? '市场合伙人' : 'Market partner'}
        </span>
        <div className="mt-auto flex flex-col items-center gap-2">
          {notifications.length > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1 text-[10px] font-semibold text-black"
              title={isZh ? '有新的主动任务结果' : 'New proactive result'}
            >
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
          {(busy || pendingCount > 0) && (
            <span className="relative flex h-2.5 w-2.5" title={isZh ? 'Agent 正在行动' : 'Agent is working'}>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-black">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101114]/95 text-white shadow-2xl backdrop-blur-xl ${className}`}
      aria-label={isZh ? '市场合伙人' : 'Marketing partner'}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.08] px-3.5">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-black">
          <SparkIcon className="h-4 w-4" />
          {busy && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101114] bg-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">
            {isZh ? '市场合伙人' : 'Marketing partner'}
          </p>
          <p className="truncate text-[10px] text-zinc-500">
            {sending
              ? isZh
                ? '正在思考，也可以继续补充'
                : 'Thinking — you can keep adding'
              : busy
                ? isZh
                  ? '正在后台行动'
                  : 'Working in the background'
                : isZh
                  ? '随时接收想法与指令'
                  : 'Ready for ideas and instructions'}
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] text-zinc-300">
            {isZh ? `${pendingCount} 条待处理` : `${pendingCount} queued`}
          </span>
        )}
        <ArtifactLibraryTrigger
          onClick={() => setArtifactDrawerOpen(true)}
          isZh={isZh}
        />
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-white"
            aria-label={isZh ? '收起 Agent' : 'Collapse agent'}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
            </svg>
          </button>
        )}
      </div>

      <ArtifactLibraryDrawer
        open={artifactDrawerOpen}
        onClose={() => setArtifactDrawerOpen(false)}
        artifacts={artifacts}
        isZh={isZh}
      />

      {viewContext && (
        <div className="mx-3 mt-3 flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-2.5 py-2 text-[10px]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
          <ContextLabel context={viewContext} isZh={isZh} />
          {onClearViewContext && (
            <button
              type="button"
              onClick={onClearViewContext}
              className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-white/[0.08] hover:text-zinc-300"
              aria-label={isZh ? '移除页面上下文' : 'Remove page context'}
            >
              ×
            </button>
          )}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="mx-3 mt-2 shrink-0 space-y-1.5">
          {notifications.slice(0, 2).map((notification) => {
            const content = (
              <>
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    notification.priority === 'blocking'
                      ? 'bg-red-400'
                      : notification.priority === 'important'
                        ? 'bg-amber-300'
                        : 'bg-sky-400'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-zinc-100">
                    {notification.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] leading-relaxed text-zinc-500">
                    {notification.summary}
                  </span>
                </span>
                {notification.href && (
                  <svg
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9 18 6-6-6-6"
                    />
                  </svg>
                )}
              </>
            );

            return notification.href ? (
              <Link
                key={notification.id}
                href={notification.href}
                onClick={() => onReadNotification?.(notification.id)}
                className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-2.5 py-2 transition-colors hover:border-white/[0.16] hover:bg-white/[0.07]"
              >
                {content}
              </Link>
            ) : (
              <button
                key={notification.id}
                type="button"
                onClick={() => onReadNotification?.(notification.id)}
                className="flex w-full items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.07]"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={() => {
          const element = scrollRef.current;
          if (!element) return;
          stickToBottomRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            72;
          if (stickToBottomRef.current) setUnseenCount(0);
        }}
        className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4"
      >
        {messages.length === 0 && (
          <div className="flex min-h-full flex-col items-center justify-center px-5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200">
              <SparkIcon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-zinc-100">
              {isZh ? '告诉我你想推进什么' : 'What should we move forward?'}
            </p>
            <p className="mt-1.5 max-w-[250px] text-xs leading-relaxed text-zinc-500">
              {isZh
                ? '我会结合左侧正在查看的内容，判断、执行，并把完整成果放回工作区。'
                : 'I will use what you are viewing, make decisions, act, and return full results to the workspace.'}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div className="max-w-[92%]">
              {message.role !== 'user' && (
                <p className="mb-1.5 px-1 text-[9px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                  {message.role === 'system'
                    ? isZh
                      ? '系统'
                      : 'System'
                    : isZh
                      ? '市场合伙人'
                      : 'Market partner'}
                </p>
              )}
              {message.role === 'assistant' &&
                (message.replyToMessageIds?.length ?? 0) > 0 && (
                  <p className="mb-1 px-1 text-[9px] text-zinc-600">
                    {isZh
                      ? `回复你前面的 ${message.replyToMessageIds!.length} 条消息`
                      : `Replying to ${message.replyToMessageIds!.length} earlier message${
                          message.replyToMessageIds!.length === 1 ? '' : 's'
                        }`}
                  </p>
                )}
              {message.content && (
                <div
                  className={
                    message.role === 'user'
                      ? 'rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-black'
                      : 'rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.045] px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-200'
                  }
                >
                  <Markdown
                    text={message.content}
                    className={`doc-prose doc-prose-invert !text-[13px] !leading-relaxed !text-inherit [&_p]:m-0 [&_p+p]:mt-2 ${
                      message.role === 'user' ? '!text-black' : ''
                    }`}
                  />
                </div>
              )}
              {message.card && (
                <InteractiveMessageCard
                  messageId={message.id}
                  card={message.card}
                  onSubmitOptions={onSubmitOptions}
                  onSubmitKickoff={onSubmitKickoff}
                />
              )}
              {message.artifact && (
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[11px] text-zinc-300">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      message.artifact.status === 'error'
                        ? 'bg-red-400'
                        : message.artifact.status === 'waiting'
                          ? 'bg-amber-300'
                        : message.artifact.status === 'done'
                          ? 'bg-emerald-400'
                      : 'animate-pulse bg-amber-300'
                    }`}
                  />
                  {message.artifact.href ? (
                    <Link
                      href={message.artifact.href}
                      className="flex min-w-0 flex-1 items-center gap-1.5 hover:text-white"
                    >
                      <span className="truncate">{message.artifact.label}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span className="truncate">{message.artifact.label}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start" aria-live="polite">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.045] px-3.5 py-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:240ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {unseenCount > 0 && (
        <button
          type="button"
          onClick={() => {
            bottomRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
            });
            stickToBottomRef.current = true;
            setUnseenCount(0);
          }}
          className="absolute bottom-[122px] left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/[0.12] bg-[#24262b] px-3 py-1.5 text-[10px] text-zinc-200 shadow-xl hover:bg-[#2d3036]"
        >
          {isZh ? `${unseenCount} 条新消息 ↓` : `${unseenCount} new ↓`}
        </button>
      )}

      <div className="shrink-0 border-t border-white/[0.08] p-3">
        {(busy || pendingCount > 0) && (
          <div className="mb-2 flex items-center gap-2 px-1 text-[10px] text-zinc-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span>
              {pendingCount > 0
                ? isZh
                  ? `已收到 ${pendingCount} 条补充，将按顺序处理`
                  : `${pendingCount} additions received and queued`
                : isZh
                  ? '后台任务进行中，你可以继续对话'
                  : 'Background work is running — keep chatting'}
            </span>
          </div>
        )}
        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.055] p-1.5 transition-colors focus-within:border-white/20">
          <textarea
            value={input}
            onChange={(event) => onInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (input.trim()) onSend();
              }
            }}
            rows={2}
            placeholder={
              isZh
                ? sending
                  ? '继续补充，我会一起处理…'
                  : '说出你的想法或下一步…'
                : sending
                  ? 'Keep adding — I will include it…'
                  : 'Share an idea or next step…'
            }
            className="max-h-36 min-h-12 w-full resize-none bg-transparent px-2 py-1.5 text-[13px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <div className="flex items-center justify-between pl-2">
            <span className="text-[9px] text-zinc-700">
              {isZh ? 'Enter 发送 · Shift Enter 换行' : 'Enter send · Shift Enter new line'}
            </span>
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-zinc-700"
              aria-label={isZh ? '发送' : 'Send'}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
