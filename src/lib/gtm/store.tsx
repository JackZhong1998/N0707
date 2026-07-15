'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  createInitialStore,
  GTM_STORE_VERSION,
  type ChatMessage,
  type ChannelStrategyDoc,
  type GtmStore,
  type MarketStrategy,
  type Todo,
} from './types';

const STORAGE_PREFIX = 'nowbuild-gtm-v4-';

function storageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}${userId ?? 'anonymous'}`;
}

function migrate(raw: unknown): GtmStore {
  const fresh = createInitialStore();
  if (!raw || typeof raw !== 'object') return fresh;
  const parsed = raw as Partial<GtmStore>;
  if (parsed.version !== GTM_STORE_VERSION) return fresh;
  return { ...fresh, ...parsed, version: GTM_STORE_VERSION };
}

function loadStore(key: string): GtmStore {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // corrupt storage — start fresh
  }
  return createInitialStore();
}

export function makeMessage(
  message: Omit<ChatMessage, 'id' | 'createdAt'>
): ChatMessage {
  return { ...message, id: crypto.randomUUID(), createdAt: Date.now() };
}

interface GtmContextValue {
  store: GtmStore;
  hydrated: boolean;
  update: (patch: Partial<GtmStore>) => void;
  setPaid: (paid: boolean) => void;
  addDirectorMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => ChatMessage;
  patchDirectorMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setProfiles: (userDoc: string, projectDoc: string) => void;
  setStrategy: (strategy: MarketStrategy) => void;
  upsertChannelStrategy: (doc: ChannelStrategyDoc) => void;
  setChannels: (channels: string[]) => void;
  replaceChannelTodos: (channelId: string, todos: Todo[]) => void;
  updateTodo: (todoId: string, patch: Partial<Todo>) => void;
  addTodoChatMessage: (
    todoId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ) => void;
  resetAll: () => void;
}

const GtmContext = createContext<GtmContextValue | null>(null);

function useOptionalClerkUserId(): { userId: string | null; isLoaded: boolean } {
  // Clerk 未配置（无 ClerkProvider）时 useAuth 会抛错；退化为匿名。
  // Provider 的存在与否在应用生命周期内恒定，因此 hook 顺序稳定。
  try {
    const auth = useAuth();
    return { userId: auth.userId ?? null, isLoaded: auth.isLoaded };
  } catch {
    return { userId: null, isLoaded: true };
  }
}

export function GtmProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useOptionalClerkUserId();
  const [store, setStore] = useState<GtmStore>(() => {
    if (typeof window === 'undefined') return createInitialStore();
    return loadStore(storageKey(null));
  });
  const [hydrated, setHydrated] = useState(() => typeof window !== 'undefined');
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || keyRef.current) return;
    const key = storageKey(userId ?? null);
    keyRef.current = key;

    let loaded = loadStore(key);
    // 匿名期间产生的数据迁移到用户 key
    if (userId) {
      const anonKey = storageKey(null);
      const anonRaw = localStorage.getItem(anonKey);
      if (anonRaw && loaded.directorChat.length === 0 && !loaded.paid) {
        try {
          const anonStore = migrate(JSON.parse(anonRaw));
          if (anonStore.directorChat.length > 0 || anonStore.paid) {
            loaded = anonStore;
          }
        } catch {
          // ignore
        }
        localStorage.removeItem(anonKey);
      }
    }
    setStore(loaded);
    setHydrated(true);
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!hydrated || !keyRef.current) return;
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(store));
    } catch {
      // quota exceeded — ignore
    }
  }, [store, hydrated]);

  const update = useCallback((patch: Partial<GtmStore>) => {
    setStore((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  const setPaid = useCallback((paid: boolean) => {
    setStore((prev) => ({ ...prev, paid, updatedAt: Date.now() }));
  }, []);

  const addDirectorMessage = useCallback(
    (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      const msg = makeMessage(message);
      setStore((prev) => ({
        ...prev,
        directorChat: [...prev.directorChat, msg],
        msgSinceContextSync: prev.msgSinceContextSync + 1,
        updatedAt: Date.now(),
      }));
      return msg;
    },
    []
  );

  const patchDirectorMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setStore((prev) => ({
        ...prev,
        directorChat: prev.directorChat.map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
        updatedAt: Date.now(),
      }));
    },
    []
  );

  const setProfiles = useCallback((userDoc: string, projectDoc: string) => {
    setStore((prev) => ({
      ...prev,
      userProfileDoc: userDoc,
      projectProfileDoc: projectDoc,
      msgSinceContextSync: 0,
      updatedAt: Date.now(),
    }));
  }, []);

  const setStrategy = useCallback((strategy: MarketStrategy) => {
    setStore((prev) => ({ ...prev, strategy, updatedAt: Date.now() }));
  }, []);

  const upsertChannelStrategy = useCallback((doc: ChannelStrategyDoc) => {
    setStore((prev) => ({
      ...prev,
      channelStrategies: { ...prev.channelStrategies, [doc.channelId]: doc },
      channels: prev.channels.includes(doc.channelId)
        ? prev.channels
        : [...prev.channels, doc.channelId],
      updatedAt: Date.now(),
    }));
  }, []);

  const setChannels = useCallback((channels: string[]) => {
    setStore((prev) => ({ ...prev, channels, updatedAt: Date.now() }));
  }, []);

  const replaceChannelTodos = useCallback(
    (channelId: string, todos: Todo[]) => {
      setStore((prev) => ({
        ...prev,
        todos: [
          ...prev.todos.filter((t) => t.channelId !== channelId),
          ...todos,
        ].sort((a, b) => a.dayIndex - b.dayIndex || a.channelId.localeCompare(b.channelId)),
        updatedAt: Date.now(),
      }));
    },
    []
  );

  const updateTodo = useCallback((todoId: string, patch: Partial<Todo>) => {
    setStore((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.id === todoId ? { ...t, ...patch } : t)),
      updatedAt: Date.now(),
    }));
  }, []);

  const addTodoChatMessage = useCallback(
    (todoId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      setStore((prev) => ({
        ...prev,
        todoChats: {
          ...prev.todoChats,
          [todoId]: [...(prev.todoChats[todoId] ?? []), makeMessage(message)],
        },
        updatedAt: Date.now(),
      }));
    },
    []
  );

  const resetAll = useCallback(() => {
    const fresh = createInitialStore();
    setStore(fresh);
    if (keyRef.current) {
      localStorage.setItem(keyRef.current, JSON.stringify(fresh));
    }
  }, []);

  return (
    <GtmContext.Provider
      value={{
        store,
        hydrated,
        update,
        setPaid,
        addDirectorMessage,
        patchDirectorMessage,
        setProfiles,
        setStrategy,
        upsertChannelStrategy,
        setChannels,
        replaceChannelTodos,
        updateTodo,
        addTodoChatMessage,
        resetAll,
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

export function findTodo(store: GtmStore, todoId: string): Todo | undefined {
  return store.todos.find((t) => t.id === todoId);
}
