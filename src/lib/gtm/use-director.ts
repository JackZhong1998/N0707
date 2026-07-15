'use client';

/**
 * 市场总监对话编排 Hook
 *
 * - 发送消息给市场总监，处理回复与选项卡片
 * - 执行总监派发的后台任务（策略生成 / 渠道专员编写 To-Do），
 *   以进度卡片呈现，完成后插入可点击的策略卡片 / 日历卡片
 * - 每积累若干消息调用一次上下文管理 Agent，累积两份档案
 */

import { useCallback, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useGtm } from './store';
import {
  callChannelTodos,
  callContextAgent,
  callDirector,
  callStrategist,
} from './api-client';
import { addDays, todayStr } from './dates';
import {
  CONTEXT_SYNC_INTERVAL,
  type DirectorAction,
  type GtmStore,
  type OptionCard,
  type Todo,
} from './types';

export function useDirector() {
  const gtm = useGtm();
  const locale = useLocale();
  const [sending, setSending] = useState(false);
  const [backgroundTasks, setBackgroundTasks] = useState<string[]>([]);
  // store 的最新引用（后台任务链中避免闭包读到旧值）
  const storeRef = useRef<GtmStore>(gtm.store);
  storeRef.current = gtm.store;
  // React 状态落盘前的同步缓存：策略生成后立即派发 To-Do 时使用
  const freshStrategiesRef = useRef<Record<string, { markdown: string; name: string }>>({});

  const syncContext = useCallback(async () => {
    const store = storeRef.current;
    if (store.msgSinceContextSync < CONTEXT_SYNC_INTERVAL) return;
    try {
      const recent = store.directorChat.slice(-CONTEXT_SYNC_INTERVAL - 2);
      const res = await callContextAgent({ recentMessages: recent, store, locale });
      gtm.setProfiles(res.userProfileDoc, res.projectProfileDoc);
    } catch {
      // 档案总结失败不阻塞主流程
    }
  }, [gtm, locale]);

  const runGenerateStrategy = useCallback(
    async (channelIds: string[], feedback?: string) => {
      const taskId = `strategy-${Date.now()}`;
      setBackgroundTasks((t) => [...t, taskId]);
      const cardMsg = gtm.addDirectorMessage({
        role: 'assistant',
        content: '',
        card: { kind: 'agent-task', label: '策略生成 Agent 正在编写市场策略…', status: 'running' },
      });
      try {
        const res = await callStrategist({
          channelIds,
          store: storeRef.current,
          feedback,
          locale,
        });
        gtm.setStrategy({
          overviewMarkdown: res.overviewMarkdown,
          goal: res.goal,
          updatedAt: Date.now(),
        });
        for (const c of res.channels) {
          freshStrategiesRef.current[c.channelId] = {
            markdown: c.markdown,
            name: c.channelName,
          };
          gtm.upsertChannelStrategy({
            channelId: c.channelId,
            channelName: c.channelName,
            positioning: c.positioning,
            direction: c.direction,
            contentPillars: c.contentPillars,
            markdown: c.markdown,
            updatedAt: Date.now(),
          });
        }
        gtm.patchDirectorMessage(cardMsg.id, {
          card: { kind: 'agent-task', label: '市场策略已生成', status: 'done' },
        });
        gtm.addDirectorMessage({
          role: 'assistant',
          content: '',
          card: {
            kind: 'strategy',
            title: '30 天冷启动市场策略',
            channelIds: res.channels.map((c) => c.channelId),
          },
        });
      } catch (err) {
        gtm.patchDirectorMessage(cardMsg.id, {
          card: {
            kind: 'agent-task',
            label: `策略生成失败：${err instanceof Error ? err.message : '未知错误'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((t) => t.filter((id) => id !== taskId));
      }
    },
    [gtm, locale]
  );

  const runGenerateTodos = useCallback(
    async (channelIds: string[]) => {
      const taskId = `todos-${Date.now()}`;
      setBackgroundTasks((t) => [...t, taskId]);
      const startDate = storeRef.current.startDate ?? todayStr();
      if (!storeRef.current.startDate) {
        gtm.update({ startDate });
      }
      const cardMsg = gtm.addDirectorMessage({
        role: 'assistant',
        content: '',
        card: {
          kind: 'agent-task',
          label: `渠道专员正在编写 30 天 To-Do（${channelIds.length} 个渠道）…`,
          status: 'running',
        },
      });
      try {
        await Promise.all(
          channelIds.map(async (channelId) => {
            const res = await callChannelTodos({
              channelId,
              store: storeRef.current,
              locale,
              strategyMarkdownOverride: freshStrategiesRef.current[channelId]?.markdown,
            });
            const channelDoc = storeRef.current.channelStrategies[channelId];
            const todos: Todo[] = res.todos.map((t, i) => ({
              id: `${channelId}-${t.dayIndex}-${i}-${Date.now()}`,
              channelId,
              channelName:
                channelDoc?.channelName ??
                freshStrategiesRef.current[channelId]?.name ??
                channelId,
              dayIndex: t.dayIndex,
              date: addDays(startDate, t.dayIndex - 1),
              time: t.time,
              title: t.title,
              brief: t.brief,
              phase: t.phase,
              status: 'pending',
              contentStatus: 'none',
            }));
            gtm.replaceChannelTodos(channelId, todos);
          })
        );
        gtm.update({ planReady: true });
        gtm.patchDirectorMessage(cardMsg.id, {
          card: { kind: 'agent-task', label: '30 天 To-Do 已排入日历', status: 'done' },
        });
        gtm.addDirectorMessage({
          role: 'assistant',
          content: '',
          card: { kind: 'calendar', title: '你的 30 天行动日历已就绪' },
        });
      } catch (err) {
        gtm.patchDirectorMessage(cardMsg.id, {
          card: {
            kind: 'agent-task',
            label: `To-Do 编写失败：${err instanceof Error ? err.message : '未知错误'}`,
            status: 'error',
          },
        });
      } finally {
        setBackgroundTasks((t) => t.filter((id) => id !== taskId));
      }
    },
    [gtm, locale]
  );

  const runActions = useCallback(
    async (actions: DirectorAction[]) => {
      for (const action of actions) {
        if (action.type === 'generate_strategy') {
          await runGenerateStrategy(action.channelIds, action.feedback);
        } else if (action.type === 'generate_todos') {
          const ids =
            action.channelIds.length > 0
              ? action.channelIds
              : storeRef.current.channels;
          await runGenerateTodos(ids);
        }
      }
    },
    [runGenerateStrategy, runGenerateTodos]
  );

  /** 发送文字消息（或提交选项卡答案） */
  const send = useCallback(
    async (text: string, meta?: { fromOptionCard?: boolean; selectedIds?: string[] }) => {
      if (sending) return;
      setSending(true);
      gtm.addDirectorMessage({ role: 'user', content: text });

      // 用户在渠道选择卡中勾选的渠道 → 直接落到 store
      if (meta?.selectedIds && meta.selectedIds.length > 0) {
        const known = meta.selectedIds.filter((id) =>
          /^(xiaohongshu|user_outreach|twitter_x|wechat_official|reddit|linkedin|product_hunt|github_growth|website_copy|user_interview|competitor_research)$/.test(id)
        );
        if (known.length > 0) {
          gtm.setChannels([...new Set([...storeRef.current.channels, ...known])]);
        }
      }

      try {
        const res = await callDirector({
          message: text,
          history: storeRef.current.directorChat.slice(0, -1),
          store: storeRef.current,
          locale,
        });
        gtm.addDirectorMessage({
          role: 'assistant',
          content: res.reply,
          card: res.optionCard ? { kind: 'options', card: res.optionCard } : undefined,
        });
        void syncContext();
        if (res.actions && res.actions.length > 0) {
          void runActions(res.actions);
        }
      } catch (err) {
        gtm.addDirectorMessage({
          role: 'assistant',
          content: `抱歉，我这边出了点问题（${err instanceof Error ? err.message : '未知错误'}）。稍等片刻再发一次，或者换个说法试试。`,
        });
      } finally {
        setSending(false);
      }
    },
    [gtm, locale, runActions, sending, syncContext]
  );

  /** 提交选项卡片的选择 */
  const submitOptions = useCallback(
    (messageId: string, card: OptionCard, selected: string[], customText?: string) => {
      const labels = card.options
        .filter((o) => selected.includes(o.id))
        .map((o) => o.label);
      if (customText) labels.push(customText);
      gtm.patchDirectorMessage(messageId, {
        card: { kind: 'options', card: { ...card, answered: labels } },
      });
      void send(`我的选择：${labels.join('、')}`, {
        fromOptionCard: true,
        selectedIds: selected,
      });
    },
    [gtm, send]
  );

  return {
    send,
    submitOptions,
    sending,
    busy: sending || backgroundTasks.length > 0,
    backgroundTasks,
    runGenerateStrategy,
    runGenerateTodos,
  };
}
