'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/store';
import { buildKickoffCard } from '@/lib/gtm/kickoff';

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
        ? '你好，我是你的市场合伙人。你可以一边查看左侧的行动、选题和数据，一边随时把想法补充给我；不用等我回复完。\n\n先用 30 秒告诉我你的基本情况。之后再用一两句话说说：**你的产品是什么，解决了什么问题？**'
        : "Hi, I'm your marketing partner. Keep looking through actions, topics, and results on the left while adding ideas here—you never need to wait for a reply to finish.\n\nFirst, take 30 seconds to share the basics. Then tell me: **what is your product, and what problem does it solve?**",
    });
    addDirectorMessage({
      role: 'assistant',
      content: '',
      card: { kind: 'kickoff', card: buildKickoffCard(isZh) },
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
