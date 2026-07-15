'use client';

/**
 * 市场总监对话页
 * - 文字问答 + 选项卡片
 * - 策略生成 / To-Do 编写作为后台任务，用进度卡片与结果卡片呈现
 */

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';
import { useDirector } from '@/lib/gtm/use-director';
import { Markdown } from '@/lib/gtm/markdown';
import OptionCardView from '@/components/app/chat/OptionCardView';
import { AgentTaskCard, CalendarCard, StrategyCard } from '@/components/app/chat/MessageCards';

export default function ChatPage() {
  const { store, hydrated, addDirectorMessage } = useGtm();
  const { send, submitOptions, sending, busy } = useDirector();
  const locale = useLocale();
  const isZh = locale !== 'en';
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  // 首次进入：市场总监开场白（本地插入，不耗一次 API）
  useEffect(() => {
    if (!hydrated || greetedRef.current) return;
    greetedRef.current = true;
    if (store.directorChat.length === 0) {
      addDirectorMessage({
        role: 'assistant',
        content: isZh
          ? '你好，我是你的市场总监。接下来 30 天，我会带着你把产品真正推向市场 — 你专注做产品，市场的事，我们一起扛。\n\n先让我认识一下你的产品：**它是什么？解决了什么问题？** 目前是还在规划中，还是已经上线了？'
          : "Hi, I'm your marketing director. For the next 30 days I'll walk you to market — you focus on the product, we carry the marketing together.\n\nFirst, tell me about your product: **what is it, and what problem does it solve?** Is it still in planning, or already live?",
      });
    }
  }, [hydrated, store.directorChat.length, addDirectorMessage, isZh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.directorChat.length, sending]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    void send(text);
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="index-label animate-pulse-soft">Loading…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      {/* 消息流 */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
        {store.directorChat.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] ${m.role === 'user' ? 'text-right' : ''}`}>
              {m.role === 'assistant' && (
                <p className="index-label mb-1.5">{isZh ? '市场总监' : 'Director'}</p>
              )}
              {m.content && (
                <div
                  className={
                    m.role === 'user'
                      ? 'inline-block bg-ink px-4 py-3 text-left text-sm leading-relaxed text-white'
                      : 'inline-block border border-hairline bg-white px-4 py-3 text-sm leading-relaxed text-ink'
                  }
                >
                  <Markdown text={m.content} className="doc-prose !text-inherit [&_p]:m-0 [&_p+p]:mt-2" />
                </div>
              )}

              {m.card?.kind === 'options' &&
                (() => {
                  const optionCard = m.card.card;
                  return (
                    <OptionCardView
                      card={optionCard}
                      disabled={sending}
                      onSubmit={(selected, custom) =>
                        submitOptions(m.id, optionCard, selected, custom)
                      }
                    />
                  );
                })()}
              {m.card?.kind === 'agent-task' && (
                <AgentTaskCard label={m.card.label} status={m.card.status} />
              )}
              {m.card?.kind === 'strategy' && (
                <StrategyCard title={m.card.title} channelIds={m.card.channelIds} />
              )}
              {m.card?.kind === 'calendar' && <CalendarCard title={m.card.title} />}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="border border-hairline bg-white px-4 py-3">
              <span className="index-label animate-pulse-soft">
                {isZh ? '市场总监正在思考…' : 'Director is thinking…'}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="shrink-0 border-t border-hairline p-3 sm:p-4">
        {busy && !sending && (
          <p className="index-label mb-2 animate-pulse-soft">
            {isZh ? '后台任务进行中，你可以继续对话' : 'Background task running — keep chatting'}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder={isZh ? '告诉市场总监你的想法…' : 'Tell your director…'}
            className="max-h-40 min-h-[52px] flex-1 resize-none border border-hairline px-3.5 py-3 text-sm leading-relaxed outline-none transition-colors focus:border-ink"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center bg-ink text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200"
            aria-label={isZh ? '发送' : 'Send'}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
