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

    const activeTaskMessageId =
      store.launch?.activeAgentWorkJob?.taskMessageId ||
      store.launch?.channelPlanJob?.taskMessageId;
    const activeJobId =
      store.launch?.activeAgentWorkJob?.jobId ||
      store.launch?.channelPlanJob?.jobId;

    for (const message of store.directorChat) {
      if (
        message.card?.kind === 'agent-task' &&
        message.card.status === 'running'
      ) {
        // Server-side jobs keep running after refresh; leave the progress card alone.
        if (
          activeTaskMessageId &&
          (message.id === activeTaskMessageId ||
            message.agentJobId === activeJobId)
        ) {
          continue;
        }

        const hasQueuedWork = store.agentActionJobs.length > 0;
        patchDirectorMessage(message.id, {
          card: {
            kind: 'agent-task',
            label: hasQueuedWork
              ? isZh
                ? `${message.card.label.replace(/（[^）]*）$/, '')}（后台任务恢复中…）`
                : `${message.card.label.replace(/\s*\([^)]*\)$/, '')} (resuming background work…)`
              : isZh
                ? `${message.card.label.replace(/（[^）]*）$/, '')}（上次会话已中断，请重新发起）`
                : `${message.card.label.replace(/\s*\([^)]*\)$/, '')} (interrupted — please ask again)`,
            status: hasQueuedWork ? 'running' : 'error',
          },
        });
      }
    }

    if (store.directorChat.length > 0) return;

    addDirectorMessage({
      role: 'assistant',
      content: isZh
        ? '你好，我是你的**冷启动合伙人**。左侧是我和渠道团队交付的工作成果，这里是你唯一需要使用的修改入口。\n\n推荐先复制左侧 Prompt，让你常用的 Coding / AI 平台生成项目文档，再粘贴回来。我会免费生成完整的 30 天市场策略报告；没有项目文档时，也可以选择分析产品链接。'
        : "Hi, I'm your **Launch Partner**. The left side holds the work produced by your channel team; this is the one place to explain, question, or change any of it.\n\nStart by copying the prompt on the left into your coding/AI platform, then paste the generated project document back. I'll build the complete 30-day Market Strategy Report for free. You can also choose website analysis if you do not have a document.",
    });
  }, [
    addDirectorMessage,
    hydrated,
    isZh,
    patchDirectorMessage,
    store.agentActionJobs.length,
    store.directorChat,
    store.directorChat.length,
    store.launch?.channelPlanJob?.jobId,
    store.launch?.channelPlanJob?.taskMessageId,
    store.launch?.activeAgentWorkJob?.jobId,
    store.launch?.activeAgentWorkJob?.taskMessageId,
  ]);

  return null;
}
