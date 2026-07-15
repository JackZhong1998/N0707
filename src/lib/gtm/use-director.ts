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
import { formatKickoffAnswers } from './kickoff';
import {
  CONTEXT_SYNC_INTERVAL,
  type DirectorAction,
  type GtmStore,
  type KickoffCard,
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

        // 策略生成后：总结各渠道关键策略点，引导用户确认或提意见 —
        // 用户确认通过后才排 30 天 To-Do
        const isZh = locale !== 'en';
        const channelSummary = res.channels
          .map(
            (c) =>
              `**${c.channelName}**\n- ${isZh ? '定位' : 'Positioning'}：${c.positioning}\n- ${isZh ? '主打内容' : 'Pillars'}：${c.contentPillars.slice(0, 3).join(' / ')}`
          )
          .join('\n\n');
        gtm.addDirectorMessage({
          role: 'assistant',
          content: isZh
            ? `策略出来了，先给你划一下每个渠道的关键打法：\n\n${channelSummary}\n\n完整文档在「市场策略」页，可以点上面的卡片细看。**你先过一遍** — 哪里不对味直接告诉我（比如「小红书想更偏个人故事」），我让策略组改；方向没问题的话，我就安排各渠道把 30 天每日 To-Do 排进你的行动日历。`
            : `Strategy is ready. Here are the key plays per channel:\n\n${channelSummary}\n\nFull docs live on the Strategy page (tap the card above). **Review it first** — tell me anything that feels off and I'll have it revised; if it looks right, I'll schedule your 30-day daily to-dos.`,
          card: {
            kind: 'options',
            card: {
              question: isZh ? '这份策略方向可以吗？' : 'Happy with this direction?',
              multi: false,
              options: [
                {
                  id: 'confirm_strategy',
                  label: isZh ? '确认，开始排 30 天 To-Do' : 'Confirm — schedule my 30 days',
                },
                {
                  id: 'adjust_strategy',
                  label: isZh ? '我要调整（在下方说明想改哪里）' : 'I want changes (tell me below)',
                },
              ],
              allowCustom: true,
            },
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
              market: t.market,
              audience: t.audience,
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
          // 首次排期必须覆盖用户已确认的全部渠道（LLM 只带部分渠道时补全）；
          // 已有 To-Do 后（新增/调整渠道）只处理指定渠道
          const hasTodos = storeRef.current.todos.length > 0;
          const ids = hasTodos && action.channelIds.length > 0
            ? action.channelIds
            : [...new Set([...action.channelIds, ...storeRef.current.channels])];
          if (ids.length > 0) await runGenerateTodos(ids);
        }
      }
    },
    [runGenerateStrategy, runGenerateTodos]
  );

  /** 发送文字消息（或提交选项卡答案） */
  const send = useCallback(
    async (
      text: string,
      meta?: {
        fromOptionCard?: boolean;
        selectedIds?: string[];
        /** 用户在「策略确认卡」里选择了确认 */
        confirmStrategy?: boolean;
      }
    ) => {
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
        let actions = res.actions ?? [];
        // 兜底：用户已明确确认策略，但模型没有派发排期动作 → 前端补上，保证流程不断
        if (
          meta?.confirmStrategy &&
          storeRef.current.todos.length === 0 &&
          !actions.some((a) => a.type === 'generate_todos')
        ) {
          actions = [
            ...actions,
            { type: 'generate_todos', channelIds: storeRef.current.channels },
          ];
        }
        if (actions.length > 0) {
          void runActions(actions);
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
        confirmStrategy: selected.includes('confirm_strategy'),
      });
    },
    [gtm, send]
  );

  /** 提交冷启动问卷（多题固定卡片） */
  const submitKickoff = useCallback(
    (messageId: string, card: KickoffCard, answers: Record<string, string[]>) => {
      gtm.patchDirectorMessage(messageId, {
        card: { kind: 'kickoff', card: { ...card, answered: answers } },
      });
      void send(formatKickoffAnswers(card, answers, locale !== 'en'));
    },
    [gtm, locale, send]
  );

  return {
    send,
    submitOptions,
    submitKickoff,
    sending,
    busy: sending || backgroundTasks.length > 0,
    backgroundTasks,
    runGenerateStrategy,
    runGenerateTodos,
  };
}
