'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm, findTaskById } from '@/lib/gtm/storage';
import { getMemoryPayload } from '@/lib/gtm/memory';
import ReviewCardModal from '@/components/gtm/ReviewCardModal';
import type { Deliverable, SignalType } from '@/lib/gtm/types';

type Props = {
  params: Promise<{ id: string }>;
};

const QUICK_PROMPTS_ZH = ['更短一点，去掉销售感', '加一个真实的个人故事', '换一个更抓人的开头', '为什么这条内容这样写？'];
const QUICK_PROMPTS_EN = ['Shorter, less salesy', 'Add a personal story', 'Stronger hook', 'Why is it written this way?'];

export default function TaskDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { state, hydrated, updateTask, submitFeedback, addTaskChatMessage } = useGtm();

  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const task = findTaskById(state, id);
  const deliverable = task?.deliverable ?? null;
  const chatHistory = state.taskChats[id] ?? [];

  useEffect(() => {
    if (!hydrated || !task || task.deliverable || loading) return;
    void loadDeliverable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, task?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length, chatting]);

  const loadDeliverable = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gtm/execute-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          strategy: state.channelStrategies[task.channelId],
          memory: getMemoryPayload(state),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateTask(task.id, { deliverable: data.deliverable, status: 'in_progress' });
    } catch {
      updateTask(task.id, {
        deliverable: {
          title: task.brief,
          body: isZh
            ? '内容生成失败。点击下方「重新生成」再试一次，或直接在右侧和内容顾问说说你想要什么。'
            : 'Generation failed. Click regenerate below, or tell the content agent what you need.',
          format: task.taskType,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!deliverable) return;
    await navigator.clipboard.writeText(`${deliverable.title}\n\n${deliverable.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendChat = async (text: string) => {
    if (!text.trim() || chatting || !task || !deliverable) return;
    setChatInput('');
    addTaskChatMessage(id, { role: 'user', content: text });
    setChatting(true);
    try {
      const res = await fetch('/api/gtm/content-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          deliverable,
          history: chatHistory,
          message: text,
          memory: getMemoryPayload(state),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addTaskChatMessage(id, { role: 'assistant', content: data.reply });
      if (data.revisedBody) {
        const revised: Deliverable = {
          ...deliverable,
          body: data.revisedBody,
          title: data.revisedTitle ?? deliverable.title,
        };
        updateTask(id, { deliverable: revised });
      }
    } catch (err) {
      addTaskChatMessage(id, {
        role: 'assistant',
        content: isZh
          ? `出错了：${err instanceof Error ? err.message : '请重试'}`
          : `Error: ${err instanceof Error ? err.message : 'please retry'}`,
      });
    } finally {
      setChatting(false);
    }
  };

  const handleReviewSubmit = (data: {
    published: boolean;
    signals: SignalType[];
    conversionNote?: string;
    feelingNote?: string;
  }) => {
    submitFeedback({ taskId: id, ...data, submittedAt: Date.now() });
    setShowReview(false);
    router.push('/workspace/marketing/today');
  };

  if (!hydrated) return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  if (!task) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        {isZh ? '任务不存在' : 'Task not found'}
      </div>
    );
  }

  const quickPrompts = isZh ? QUICK_PROMPTS_ZH : QUICK_PROMPTS_EN;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/workspace/marketing/today')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M13 8H3M7 4L3 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <p className="text-xs text-gray-400">
              {task.channelName} · {isZh ? `第 ${task.dayIndex} 天` : `Day ${task.dayIndex}`}
              {task.scheduledTime ? ` · ${task.scheduledTime}` : ''}
            </p>
            <h1 className="max-w-xl truncate text-sm font-semibold text-gray-900">{task.brief}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!deliverable}
            className="rounded-lg border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {copied ? (isZh ? '已复制 ✓' : 'Copied ✓') : isZh ? '复制全文' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => setShowReview(true)}
            className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
          >
            {isZh ? '标记已发 · 30 秒复盘' : 'Mark published'}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Content panel */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-gray-50/50 px-8 py-6">
          {task.strategicNote && (
            <div className="mx-auto mb-4 max-w-2xl rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800">
              <span className="font-semibold">{isZh ? '战略目的：' : 'Strategic purpose: '}</span>
              {task.strategicNote}
            </div>
          )}

          <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {loading ? (
              <div className="space-y-3">
                <div className="h-6 w-2/3 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-gray-100" />
                <p className="pt-2 text-xs text-gray-400">
                  {isZh ? '内容顾问正在按渠道方法论写稿…' : 'Content agent drafting per channel playbook…'}
                </p>
              </div>
            ) : deliverable ? (
              <>
                <h2 className="font-display text-lg font-bold text-gray-900">{deliverable.title}</h2>
                <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
                  {deliverable.body}
                </div>
                {deliverable.tips && deliverable.tips.length > 0 && (
                  <div className="mt-6 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-600">
                      {isZh ? '发布执行建议' : 'Publishing tips'}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {deliverable.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  type="button"
                  onClick={loadDeliverable}
                  className="mt-5 text-xs font-medium text-gray-400 hover:text-gray-700"
                >
                  {isZh ? '↻ 重新生成初稿' : '↻ Regenerate draft'}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Content agent chat */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
                <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path d="M10 3l1.5 4L15.5 8.5 11.5 10 10 14l-1.5-4L4.5 8.5 8.5 7 10 3z" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {isZh ? '内容顾问' : 'Content Agent'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {isZh ? '懂你的产品和这条内容的战略目的' : 'Knows your product & this task'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {chatHistory.length === 0 && (
              <div className="rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-500">
                {isZh
                  ? '我可以帮你改稿（语气/长度/结构）、解释这条内容为什么这样写、给发布建议、或者换个选题角度。直接说，或点下面的快捷指令。'
                  : 'I can revise the draft, explain the strategy behind it, give publishing advice, or explore other angles.'}
              </div>
            )}
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
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
                {isZh ? '思考中…' : 'Thinking…'}
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
                  disabled={chatting || !deliverable}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat(chatInput)}
                placeholder={isZh ? '告诉内容顾问你想怎么改…' : 'Tell the agent what you need…'}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] focus:border-gray-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => sendChat(chatInput)}
                disabled={chatting || !chatInput.trim() || !deliverable}
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

      {showReview && (
        <ReviewCardModal
          taskId={id}
          locale={locale}
          onSubmit={handleReviewSubmit}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}
