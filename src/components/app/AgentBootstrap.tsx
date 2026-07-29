'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';

/** Adds the single market-partner welcome flow regardless of which view opens first. */
export default function AgentBootstrap() {
  const locale = useLocale();
  const isZh = locale !== 'en';
  const {
    store,
    hydrated,
    addDirectorMessage,
    patchDirectorMessage,
  } = useGtm();
  const initialized = useRef(false);

  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;

    for (const message of store.directorChat) {
      if (
        message.card?.kind === 'agent-task' &&
        message.card.status === 'running'
      ) {
        patchDirectorMessage(message.id, {
          card: {
            kind: 'agent-task',
            label:
              store.agentActionJobs.length > 0
                ? `${message.card.label}（会话恢复后已重新排队）`
                : `${message.card.label}（上次会话已中断，请重新发起）`,
            status: 'error',
          },
        });
      }
    }

    if (store.directorChat.length > 0) return;

    addDirectorMessage({
      role: 'assistant',
      content: isZh
        ? '你好，我是你的**冷启动合伙人**。左侧是我和渠道团队交付的工作成果，这里是你唯一需要使用的修改入口。\n\n先在左侧粘贴产品链接。我会读取网站、研究竞品，并自动建立完整的 30 天全渠道冷启动。缺失的信息，我只会在确实影响执行时再问你。'
        : "Hi, I'm your **Launch Partner**. The left side holds the work produced by your channel team; this is the one place to explain, question, or change any of it.\n\nPaste your product URL on the left. I'll study the site and competitors, then build the complete 30-day launch across every supported channel. I'll only ask for missing details when they truly block execution.",
    });
  }, [
    addDirectorMessage,
    hydrated,
    isZh,
    patchDirectorMessage,
    store.agentActionJobs.length,
    store.directorChat,
    store.directorChat.length,
  ]);

  return null;
}
