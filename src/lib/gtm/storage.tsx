'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  createInitialGtmState,
  GTM_STATE_VERSION,
  type GtmState,
  type GtmKickoffForm,
  type ChatMessage,
  type CmoChannelRecommendation,
  type ProductProfile,
  type TaskFeedback,
  type DailyTask,
  type UnifiedDayPlan,
} from '@/lib/gtm/types';
import { computeCurrentDayIndex } from '@/lib/gtm/plan-utils';

const STORAGE_PREFIX = 'nowbuild-gtm-';

function storageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}${userId ?? 'anonymous'}`;
}

function migrate(raw: unknown): GtmState {
  const fresh = createInitialGtmState();
  if (!raw || typeof raw !== 'object') return fresh;
  const parsed = raw as Partial<GtmState>;
  const state: GtmState = {
    ...fresh,
    ...parsed,
    version: GTM_STATE_VERSION,
    productProfile: parsed.productProfile ?? fresh.productProfile,
    strategyChat: parsed.strategyChat ?? [],
    taskChats: parsed.taskChats ?? {},
  };
  if (state.campaignStartDate && (state.phase === 'execution' || state.phase === 'review')) {
    state.currentDayIndex = computeCurrentDayIndex(state.campaignStartDate);
  }
  return state;
}

function loadState(key: string): GtmState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // corrupt storage — start fresh
  }
  return createInitialGtmState();
}

interface GtmContextValue {
  state: GtmState;
  hydrated: boolean;
  updateState: (patch: Partial<GtmState>) => void;
  setKickoffForm: (form: Partial<GtmKickoffForm>) => void;
  mergeProfile: (patch: Partial<ProductProfile>) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  addStrategyChatMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  addTaskChatMessage: (taskId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  setChannelRecommendation: (rec: CmoChannelRecommendation) => void;
  setCalendar: (calendar: UnifiedDayPlan[]) => void;
  updateTask: (taskId: string, patch: Partial<DailyTask>) => void;
  submitFeedback: (feedback: TaskFeedback) => void;
  resetState: () => void;
}

const GtmContext = createContext<GtmContextValue | null>(null);

export function GtmProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const [state, setState] = useState<GtmState>(createInitialGtmState);
  const [hydrated, setHydrated] = useState(false);
  const keyRef = useRef<string | null>(null);

  // 仅在 Clerk auth 完全加载后水合一次，避免 anonymous → user 的 key 切换
  // 覆盖用户已填写的内容（此前卡片选择消失的根因）。
  useEffect(() => {
    if (!isLoaded || keyRef.current) return;
    const key = storageKey(userId ?? null);
    keyRef.current = key;

    let loaded = loadState(key);
    // 匿名期间产生的数据迁移到用户 key
    if (userId) {
      const anonKey = storageKey(null);
      const anonRaw = localStorage.getItem(anonKey);
      if (anonRaw && loaded.updatedAt === createInitialGtmState().updatedAt) {
        try {
          const anonState = migrate(JSON.parse(anonRaw));
          if (anonState.onboardingCompleted || anonState.chatHistory.length > 0) {
            loaded = anonState;
          }
        } catch {
          // ignore
        }
        localStorage.removeItem(anonKey);
      }
    }
    setState(loaded);
    setHydrated(true);
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!hydrated || !keyRef.current) return;
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(state));
    } catch {
      // quota exceeded — drop oldest deliverables would be overkill; ignore
    }
  }, [state, hydrated]);

  const updateState = useCallback((patch: Partial<GtmState>) => {
    setState((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  const setKickoffForm = useCallback((form: Partial<GtmKickoffForm>) => {
    setState((prev) => ({
      ...prev,
      kickoffForm: { ...prev.kickoffForm, ...form },
      updatedAt: Date.now(),
    }));
  }, []);

  const mergeProfile = useCallback((patch: Partial<ProductProfile>) => {
    setState((prev) => {
      const nextFacts = patch.keyFacts
        ? [...new Set([...prev.productProfile.keyFacts, ...patch.keyFacts])]
        : prev.productProfile.keyFacts;
      return {
        ...prev,
        productProfile: { ...prev.productProfile, ...patch, keyFacts: nextFacts },
        updatedAt: Date.now(),
      };
    });
  }, []);

  const makeMessage = (message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage => ({
    ...message,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  });

  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    setState((prev) => ({
      ...prev,
      chatHistory: [...prev.chatHistory, makeMessage(message)],
      updatedAt: Date.now(),
    }));
  }, []);

  const addStrategyChatMessage = useCallback(
    (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      setState((prev) => ({
        ...prev,
        strategyChat: [...prev.strategyChat, makeMessage(message)],
        updatedAt: Date.now(),
      }));
    },
    []
  );

  const addTaskChatMessage = useCallback(
    (taskId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      setState((prev) => ({
        ...prev,
        taskChats: {
          ...prev.taskChats,
          [taskId]: [...(prev.taskChats[taskId] ?? []), makeMessage(message)],
        },
        updatedAt: Date.now(),
      }));
    },
    []
  );

  const setChannelRecommendation = useCallback((rec: CmoChannelRecommendation) => {
    setState((prev) => ({
      ...prev,
      channelRecommendation: rec,
      selectedChannels: [
        ...rec.phase0.filter((c) => c.selected),
        ...rec.wave1.filter((c) => c.selected),
      ].map((c) => c.channelId),
      updatedAt: Date.now(),
    }));
  }, []);

  const setCalendar = useCallback((calendar: UnifiedDayPlan[]) => {
    setState((prev) => ({ ...prev, unifiedCalendar: calendar, updatedAt: Date.now() }));
  }, []);

  const updateTask = useCallback((taskId: string, patch: Partial<DailyTask>) => {
    setState((prev) => ({
      ...prev,
      unifiedCalendar: prev.unifiedCalendar.map((day) => ({
        ...day,
        tasks: day.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      })),
      updatedAt: Date.now(),
    }));
  }, []);

  const submitFeedback = useCallback((feedback: TaskFeedback) => {
    setState((prev) => {
      const status = feedback.published ? 'done' : 'skipped';
      return {
        ...prev,
        taskFeedbacks: { ...prev.taskFeedbacks, [feedback.taskId]: feedback },
        unifiedCalendar: prev.unifiedCalendar.map((day) => ({
          ...day,
          tasks: day.tasks.map((t) =>
            t.id === feedback.taskId ? { ...t, status } : t
          ),
        })),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const resetState = useCallback(() => {
    const fresh = createInitialGtmState();
    setState(fresh);
    if (keyRef.current) {
      localStorage.setItem(keyRef.current, JSON.stringify(fresh));
    }
  }, []);

  return (
    <GtmContext.Provider
      value={{
        state,
        hydrated,
        updateState,
        setKickoffForm,
        mergeProfile,
        addChatMessage,
        addStrategyChatMessage,
        addTaskChatMessage,
        setChannelRecommendation,
        setCalendar,
        updateTask,
        submitFeedback,
        resetState,
      }}
    >
      {children}
    </GtmContext.Provider>
  );
}

export function useGtm() {
  const ctx = useContext(GtmContext);
  if (!ctx) throw new Error('useGtm must be used within GtmProvider');
  return ctx;
}

export function findTaskById(state: GtmState, taskId: string): DailyTask | undefined {
  for (const day of state.unifiedCalendar) {
    const task = day.tasks.find((t) => t.id === taskId);
    if (task) return task;
  }
  return undefined;
}
