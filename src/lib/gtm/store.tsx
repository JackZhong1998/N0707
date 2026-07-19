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
  type AgentActionJob,
  type AgentArtifact,
  type AgentNotification,
  type ChatMessage,
  type ChannelStrategyDoc,
  type GtmStore,
  type MarketStrategy,
  type MemoryFact,
  type PendingAgentRequest,
  type Todo,
  type Topic,
  type TopicVariant,
} from './types';

const STORAGE_PREFIX = 'nowbuild-gtm-v4-';
const CLERK_CONFIGURED =
  typeof process !== 'undefined' &&
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('xxxxx')
  );

function storageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}${userId ?? 'anonymous'}`;
}

function revisionStorageKey(storeKey: string): string {
  return `${storeKey}-remote-revision`;
}

function cacheRemoteRevision(storeKey: string | null, revision: string) {
  if (!storeKey) return;
  try {
    localStorage.setItem(revisionStorageKey(storeKey), revision);
  } catch {
    // Storage can be disabled or full; conflict handling still works in-memory.
  }
}

function migrate(raw: unknown): GtmStore {
  const fresh = createInitialStore();
  if (!raw || typeof raw !== 'object') return fresh;
  const parsed = raw as Partial<GtmStore>;
  // Store upgrades are additive. A version mismatch must never discard the
  // user's conversations or plan; missing fields receive current defaults.
  // Explicit guards also keep a partially-corrupt collection from replacing a
  // valid empty default.
  // Browser storage may contain `paid: true` from the old simulated checkout.
  // Preserve the user's work, but payment access must only come from the
  // server-side Stripe subscription lookup.
  return {
    ...fresh,
    ...parsed,
    version: GTM_STORE_VERSION,
    paid: false,
    directorChat: Array.isArray(parsed.directorChat) ? parsed.directorChat : fresh.directorChat,
    channelStrategies:
      parsed.channelStrategies && typeof parsed.channelStrategies === 'object'
        ? parsed.channelStrategies
        : fresh.channelStrategies,
    channels: Array.isArray(parsed.channels) ? parsed.channels : fresh.channels,
    memoryFacts: Array.isArray(parsed.memoryFacts)
      ? parsed.memoryFacts
      : fresh.memoryFacts,
    pendingAgentRequests: Array.isArray(parsed.pendingAgentRequests)
      ? parsed.pendingAgentRequests
      : fresh.pendingAgentRequests,
    agentActionJobs: Array.isArray(parsed.agentActionJobs)
      ? parsed.agentActionJobs
      : fresh.agentActionJobs,
    artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : fresh.artifacts,
    agentNotifications: Array.isArray(parsed.agentNotifications)
      ? parsed.agentNotifications
      : fresh.agentNotifications,
    topics: Array.isArray(parsed.topics) ? parsed.topics : fresh.topics,
    topicVariants: Array.isArray(parsed.topicVariants)
      ? parsed.topicVariants
      : fresh.topicVariants,
    todos: Array.isArray(parsed.todos) ? parsed.todos : fresh.todos,
    todoChats:
      parsed.todoChats && typeof parsed.todoChats === 'object'
        ? parsed.todoChats
        : fresh.todoChats,
  };
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

function mergeById<T extends { id: string }>(
  older: T[],
  newer: T[]
): T[] {
  const merged = new Map(older.map((item) => [item.id, item]));
  for (const item of newer) merged.set(item.id, item);
  return [...merged.values()];
}

/**
 * Local storage is a small write-ahead cache. A refresh can happen before the
 * debounced Supabase PUT, so a newer local snapshot must not be discarded just
 * because remote data exists. Older durable chat rows are still merged back in.
 */
function mergeHydratedStores(
  localStore: GtmStore,
  remoteStore: GtmStore
): GtmStore {
  const directorChat = mergeById(
    remoteStore.directorChat,
    localStore.directorChat
  )
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-300);
  const repliedTo = new Set(
    remoteStore.directorChat.flatMap(
      (message) => message.replyToMessageIds ?? []
    )
  );
  return {
    // A different cached revision means another session changed the project
    // while this tab was offline. Without the common base, server state wins
    // for mutable documents/entities; append-only messages and truly-unhandled
    // local inbox entries are the only safe additions.
    ...remoteStore,
    paid: remoteStore.paid,
    directorChat,
    pendingAgentRequests: mergeById(
      remoteStore.pendingAgentRequests,
      localStore.pendingAgentRequests.filter(
        (request) => !repliedTo.has(request.messageId)
      )
    ).sort((a, b) => a.createdAt - b.createdAt),
    updatedAt: remoteStore.updatedAt,
  };
}

function sameState(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeThreeWayValue<T>(
  base: T,
  remote: T,
  local: T
): T {
  if (sameState(local, base)) return remote;
  if (sameState(remote, base)) return local;
  // Both sides changed the same scalar/document. The local value represents
  // the user's currently-attempted write; entity collections are reconciled
  // separately below.
  return local;
}

function mergeThreeWayByKey<T>(
  baseItems: T[],
  remoteItems: T[],
  localItems: T[],
  keyOf: (item: T) => string
): T[] {
  const base = new Map(baseItems.map((item) => [keyOf(item), item]));
  const remote = new Map(remoteItems.map((item) => [keyOf(item), item]));
  const local = new Map(localItems.map((item) => [keyOf(item), item]));
  const merged: T[] = [];
  for (const key of new Set([
    ...base.keys(),
    ...remote.keys(),
    ...local.keys(),
  ])) {
    const baseItem = base.get(key);
    const remoteItem = remote.get(key);
    const localItem = local.get(key);
    let selected: T | undefined;
    if (sameState(localItem, baseItem)) {
      selected = remoteItem;
    } else if (sameState(remoteItem, baseItem)) {
      selected = localItem;
    } else if (localItem === undefined || remoteItem === undefined) {
      // Both sides changed and one side deleted the entity. Deletion wins so
      // a completed job or intentionally removed topic cannot be resurrected.
      selected = undefined;
    } else {
      selected = localItem;
    }
    if (selected !== undefined) merged.push(selected);
  }
  return merged;
}

function mergeThreeWayChannels(
  base: string[],
  remote: string[],
  local: string[]
): string[] {
  const baseSet = new Set(base);
  const remoteSet = new Set(remote);
  const localSet = new Set(local);
  return [...new Set([...base, ...remote, ...local])].filter((channelId) => {
    const inBase = baseSet.has(channelId);
    const inRemote = remoteSet.has(channelId);
    const inLocal = localSet.has(channelId);
    if (inLocal === inBase) return inRemote;
    if (inRemote === inBase) return inLocal;
    return inLocal;
  });
}

function mergeThreeWayTodoChats(
  baseChats: Record<string, ChatMessage[]>,
  remoteChats: Record<string, ChatMessage[]>,
  localChats: Record<string, ChatMessage[]>
): Record<string, ChatMessage[]> {
  const merged: Record<string, ChatMessage[]> = {};
  for (const todoId of new Set([
    ...Object.keys(baseChats),
    ...Object.keys(remoteChats),
    ...Object.keys(localChats),
  ])) {
    const base = baseChats[todoId];
    const remote = remoteChats[todoId];
    const local = localChats[todoId];
    if (sameState(local, base)) {
      if (remote) merged[todoId] = remote;
    } else if (sameState(remote, base)) {
      if (local) merged[todoId] = local;
    } else if (local && remote) {
      merged[todoId] = mergeThreeWayByKey(
        base ?? [],
        remote,
        local,
        (message) => message.id
      ).sort((a, b) => a.createdAt - b.createdAt);
    }
  }
  return merged;
}

/**
 * A 409 means another tab or device saved after this snapshot was loaded.
 * Reconcile both attempted writes against the exact common server base.
 * This preserves independent additions and also preserves deletions/terminal
 * removals, without trusting clocks from different devices.
 */
function mergeConflictingStores(
  localStore: GtmStore,
  remoteStore: GtmStore,
  baseStore: GtmStore
): GtmStore {
  const mergedFactsById = mergeThreeWayByKey(
    baseStore.memoryFacts,
    remoteStore.memoryFacts,
    localStore.memoryFacts,
    (fact) => fact.id
  );
  const memoryFacts = new Map<string, MemoryFact>();
  for (const fact of mergedFactsById) {
    const key = `${fact.category}:${fact.key}`;
    const existing = memoryFacts.get(key);
    if (
      !existing ||
      fact.updatedAt > existing.updatedAt ||
      (fact.confirmed && !existing.confirmed)
    ) {
      memoryFacts.set(key, fact);
    }
  }

  const channelDocs = mergeThreeWayByKey(
    Object.values(baseStore.channelStrategies),
    Object.values(remoteStore.channelStrategies),
    Object.values(localStore.channelStrategies),
    (doc) => doc.channelId
  );
  const channelStrategies = Object.fromEntries(
    channelDocs.map((doc) => [doc.channelId, doc])
  );

  return {
    ...remoteStore,
    planReady: mergeThreeWayValue(
      baseStore.planReady,
      remoteStore.planReady,
      localStore.planReady
    ),
    userProfileDoc: mergeThreeWayValue(
      baseStore.userProfileDoc,
      remoteStore.userProfileDoc,
      localStore.userProfileDoc
    ),
    projectProfileDoc: mergeThreeWayValue(
      baseStore.projectProfileDoc,
      remoteStore.projectProfileDoc,
      localStore.projectProfileDoc
    ),
    conversationSummary: mergeThreeWayValue(
      baseStore.conversationSummary,
      remoteStore.conversationSummary,
      localStore.conversationSummary
    ),
    paid: remoteStore.paid,
    strategy: mergeThreeWayValue(
      baseStore.strategy,
      remoteStore.strategy,
      localStore.strategy
    ),
    channelStrategies,
    channels: mergeThreeWayChannels(
      baseStore.channels,
      remoteStore.channels,
      localStore.channels
    ),
    memoryFacts: [...memoryFacts.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 120),
    directorChat: mergeThreeWayByKey(
      baseStore.directorChat,
      remoteStore.directorChat,
      localStore.directorChat,
      (message) => message.id
    )
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-300),
    pendingAgentRequests: mergeThreeWayByKey(
      baseStore.pendingAgentRequests,
      remoteStore.pendingAgentRequests,
      localStore.pendingAgentRequests,
      (request) => request.id
    ).sort((a, b) => a.createdAt - b.createdAt),
    agentActionJobs: mergeThreeWayByKey(
      baseStore.agentActionJobs,
      remoteStore.agentActionJobs,
      localStore.agentActionJobs,
      (job) => job.id
    ).sort((a, b) => a.createdAt - b.createdAt),
    artifacts: mergeThreeWayByKey(
      baseStore.artifacts,
      remoteStore.artifacts,
      localStore.artifacts,
      (artifact) => artifact.id
    )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20),
    agentNotifications: mergeThreeWayByKey(
      baseStore.agentNotifications,
      remoteStore.agentNotifications,
      localStore.agentNotifications,
      (notification) => notification.id
    )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 40),
    topics: mergeThreeWayByKey(
      baseStore.topics,
      remoteStore.topics,
      localStore.topics,
      (topic) => topic.id
    ),
    topicVariants: mergeThreeWayByKey(
      baseStore.topicVariants,
      remoteStore.topicVariants,
      localStore.topicVariants,
      (variant) => variant.id
    ),
    todos: mergeThreeWayByKey(
      baseStore.todos,
      remoteStore.todos,
      localStore.todos,
      (todo) => todo.id
    ),
    todoChats: mergeThreeWayTodoChats(
      baseStore.todoChats,
      remoteStore.todoChats,
      localStore.todoChats
    ),
    startDate: mergeThreeWayValue(
      baseStore.startDate,
      remoteStore.startDate,
      localStore.startDate
    ),
    msgSinceContextSync: mergeThreeWayValue(
      baseStore.msgSinceContextSync,
      remoteStore.msgSinceContextSync,
      localStore.msgSinceContextSync
    ),
    lastReflectionAt: mergeThreeWayValue(
      baseStore.lastReflectionAt,
      remoteStore.lastReflectionAt,
      localStore.lastReflectionAt
    ),
    updatedAt: Date.now(),
  };
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
  addDirectorMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => ChatMessage;
  patchDirectorMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setProfiles: (userDoc: string, projectDoc: string) => void;
  setMemoryState: (
    summary: string,
    facts: MemoryFact[],
    processedMessageCount?: number
  ) => void;
  setStrategy: (strategy: MarketStrategy) => void;
  upsertChannelStrategy: (doc: ChannelStrategyDoc) => void;
  setChannels: (channels: string[]) => void;
  createTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => Topic;
  updateTopic: (topicId: string, patch: Partial<Topic>) => void;
  deleteTopic: (topicId: string) => void;
  createTopicVariant: (
    variant: Omit<TopicVariant, 'id' | 'createdAt' | 'updatedAt'>
  ) => TopicVariant;
  updateTopicVariant: (variantId: string, patch: Partial<TopicVariant>) => void;
  deleteTopicVariant: (variantId: string) => void;
  enqueueAgentRequest: (request: PendingAgentRequest) => void;
  removeAgentRequests: (requestIds: string[]) => void;
  clearAgentRequests: () => void;
  enqueueAgentActionJob: (job: AgentActionJob) => void;
  updateAgentActionJob: (
    jobId: string,
    patch: Partial<AgentActionJob>
  ) => void;
  removeAgentActionJob: (jobId: string) => void;
  createArtifact: (
    artifact: Omit<AgentArtifact, 'id' | 'version' | 'createdAt' | 'updatedAt'>
  ) => AgentArtifact;
  updateArtifact: (artifactId: string, patch: Partial<AgentArtifact>) => void;
  addAgentNotification: (
    notification: Omit<AgentNotification, 'id' | 'read' | 'createdAt'>
  ) => AgentNotification;
  markAgentNotificationRead: (notificationId: string) => void;
  createTodo: (todo: Omit<Todo, 'id'>) => Todo;
  replaceChannelTodos: (channelId: string, todos: Todo[]) => void;
  updateTodo: (todoId: string, patch: Partial<Todo>) => void;
  addTodoChatMessage: (
    todoId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ) => void;
  resetAll: () => void;
}

const GtmContext = createContext<GtmContextValue | null>(null);

function ClerkGtmProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return (
    <GtmProviderState userId={auth.userId ?? null} isLoaded={auth.isLoaded}>
      {children}
    </GtmProviderState>
  );
}

export function GtmProvider({ children }: { children: React.ReactNode }) {
  return CLERK_CONFIGURED ? (
    <ClerkGtmProvider>{children}</ClerkGtmProvider>
  ) : (
    <GtmProviderState userId={null} isLoaded>
      {children}
    </GtmProviderState>
  );
}

function GtmProviderState({
  children,
  userId,
  isLoaded,
}: {
  children: React.ReactNode;
  userId: string | null;
  isLoaded: boolean;
}) {
  // Keep the server and first client render identical. The keyed local
  // write-ahead cache is loaded by the hydration effect below.
  const [store, setStore] = useState<GtmStore>(createInitialStore);
  const [hydrated, setHydrated] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const keyRef = useRef<string | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const queuedRemoteStoreRef = useRef<GtmStore | null>(null);
  const remoteSaveRunningRef = useRef(false);
  const remoteRetryTimerRef = useRef<number | null>(null);
  const remoteRevisionRef = useRef<string | null>(null);
  const remoteBaseStoreRef = useRef<GtmStore | null>(null);
  const flushRemoteSavesRef = useRef<() => Promise<void>>(
    async () => undefined
  );

  const flushRemoteSaves = useCallback(async () => {
    if (remoteSaveRunningRef.current) return;
    remoteSaveRunningRef.current = true;
    let shouldRetry = false;
    try {
      while (queuedRemoteStoreRef.current) {
        const snapshot = queuedRemoteStoreRef.current;
        queuedRemoteStoreRef.current = null;
        try {
          const response = await fetch('/api/gtm/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              store: snapshot,
              ...(remoteRevisionRef.current
                ? { revision: remoteRevisionRef.current }
                : {}),
            }),
          });
          if (response.status === 409) {
            const latestResponse = await fetch('/api/gtm/state', {
              cache: 'no-store',
            });
            if (!latestResponse.ok) {
              throw new Error(
                `State conflict refresh failed: ${latestResponse.status}`
              );
            }
            const latest = (await latestResponse.json()) as {
              store: GtmStore;
              revision: string;
            };
            const base = remoteBaseStoreRef.current ?? latest.store;
            remoteRevisionRef.current = latest.revision;
            remoteBaseStoreRef.current = latest.store;
            cacheRemoteRevision(keyRef.current, latest.revision);
            const merged = mergeConflictingStores(
              snapshot,
              latest.store,
              base
            );
            setStore((current) =>
              mergeConflictingStores(current, latest.store, base)
            );
            // Do not overwrite a newer local edit that was queued while the
            // conflict was being resolved; merge that edit into this retry.
            queuedRemoteStoreRef.current = queuedRemoteStoreRef.current
              ? mergeConflictingStores(
                  queuedRemoteStoreRef.current,
                  latest.store,
                  base
                )
              : merged;
            continue;
          }
          if (!response.ok) {
            console.error(`Supabase state save failed: ${response.status}`);
            if (response.status === 429 || response.status >= 500) {
              queuedRemoteStoreRef.current ??= snapshot;
              shouldRetry = true;
              break;
            }
            continue;
          }
          const saved = (await response.json()) as { revision?: unknown };
          if (typeof saved.revision === 'string') {
            remoteRevisionRef.current = saved.revision;
            remoteBaseStoreRef.current = snapshot;
            cacheRemoteRevision(keyRef.current, saved.revision);
          }
        } catch (error) {
          console.error('Supabase state save failed:', error);
          // Preserve the latest snapshot across transient network failures.
          // A newer queued snapshot wins because it already contains this one.
          queuedRemoteStoreRef.current ??= snapshot;
          shouldRetry = true;
          break;
        }
      }
    } finally {
      remoteSaveRunningRef.current = false;
      if (
        shouldRetry &&
        remoteRetryTimerRef.current === null &&
        typeof window !== 'undefined'
      ) {
        remoteRetryTimerRef.current = window.setTimeout(() => {
          remoteRetryTimerRef.current = null;
          void flushRemoteSavesRef.current();
        }, 2_500);
      }
    }
  }, []);
  flushRemoteSavesRef.current = flushRemoteSaves;

  useEffect(() => {
    if (!isLoaded) return;
    const key = storageKey(userId ?? null);
    if (keyRef.current === key) return;

    keyRef.current = key;
    loadedKeyRef.current = null;
    remoteRevisionRef.current = null;
    remoteBaseStoreRef.current = null;
    queuedRemoteStoreRef.current = null;
    setHydrated(false);
    setRemoteReady(false);

    let localStore = loadStore(key);
    let cachedRemoteRevision: string | null = null;
    try {
      cachedRemoteRevision = localStorage.getItem(revisionStorageKey(key));
    } catch {
      // Ignore storage access failures; the remote snapshot remains canonical.
    }
    // 匿名期间产生的数据迁移到用户 key
    if (userId) {
      const anonKey = storageKey(null);
      const anonRaw = localStorage.getItem(anonKey);
      if (
        anonRaw &&
        localStore.directorChat.length === 0 &&
        localStore.todos.length === 0 &&
        localStore.topics.length === 0
      ) {
        try {
          const anonStore = migrate(JSON.parse(anonRaw));
          if (
            anonStore.directorChat.length > 0 ||
            anonStore.todos.length > 0 ||
            anonStore.topics.length > 0
          ) {
            localStore = anonStore;
          }
        } catch {
          // ignore
        }
        localStorage.removeItem(anonKey);
      }
    }

    if (!userId) {
      setStore(localStore);
      loadedKeyRef.current = key;
      setRemoteReady(true);
      setHydrated(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      const fetchJson = async <T,>(url: string, timeoutMs: number): Promise<T> => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            cache: 'no-store',
            signal: controller.signal,
          });
          if (!response.ok) {
            let detail = '';
            try {
              const body = (await response.json()) as {
                detail?: unknown;
                error?: unknown;
              };
              detail =
                typeof body.detail === 'string'
                  ? body.detail
                  : typeof body.error === 'string'
                    ? body.error
                    : '';
            } catch {
              // Some intermediaries return a non-JSON error page.
            }
            throw new Error(
              `${url} request failed: ${response.status}${
                detail ? `: ${detail}` : ''
              }`
            );
          }
          return (await response.json()) as T;
        } finally {
          window.clearTimeout(timeout);
        }
      };

      try {
        const checkoutReturn = new URLSearchParams(window.location.search).get('checkout') === 'success';
        const attempts = checkoutReturn ? 5 : 1;
        let paid = false;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
          const access = await fetchJson<{ paid: boolean }>('/api/gtm/access', 5_000);
          paid = access.paid;
          if (paid || !checkoutReturn || attempt === attempts - 1) break;
          await new Promise((resolve) => window.setTimeout(resolve, 800));
        }

        if (cancelled) return;

        // Unpaid users only need the access decision. Paid users stay behind
        // the hydration gate until their durable inbox and job outbox are
        // loaded, otherwise a late remote snapshot could erase a new message.
        const accessStore = { ...localStore, paid };
        setStore(accessStore);
        loadedKeyRef.current = key;

        if (!paid) {
          setRemoteReady(true);
          setHydrated(true);
          return;
        }

        // The local write-ahead cache is already safe to render. Remote state
        // continues hydrating in the background, so a transient schema/network
        // error can never leave the whole product behind a permanent spinner.
        setHydrated(true);
        let remoteAttempt = 0;
        while (!cancelled) {
          try {
            const payload = await fetchJson<{
              store: GtmStore;
              hasRemoteData: boolean;
              revision: string;
            }>('/api/gtm/state', 15_000);
            if (cancelled) return;
            remoteRevisionRef.current = payload.revision;
            remoteBaseStoreRef.current = payload.store;
            cacheRemoteRevision(key, payload.revision);
            setStore((current) =>
              payload.hasRemoteData
                ? cachedRemoteRevision === payload.revision
                  ? mergeConflictingStores(
                      current,
                      { ...payload.store, paid: true },
                      { ...payload.store, paid: true }
                    )
                  : mergeHydratedStores(current, {
                      ...payload.store,
                      paid: true,
                    })
                : { ...current, paid: true }
            );
            setRemoteReady(true);
            setHydrated(true);
            return;
          } catch (error) {
            remoteAttempt += 1;
            if (remoteAttempt === 1) {
              console.warn(
                `Supabase state refresh failed; using local cache while retrying: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
              // The user can keep working in the local write-ahead cache. We
              // intentionally keep remoteReady=false so no stale full snapshot
              // is uploaded before the remote state has been merged.
            }
            const retryMs = Math.min(
              30_000,
              1_500 * 2 ** Math.min(remoteAttempt - 1, 4)
            );
            await new Promise((resolve) =>
              window.setTimeout(resolve, retryMs)
            );
          }
        }
      } catch (error) {
        console.error('Subscription check failed; denying access:', error);
        if (!cancelled && keyRef.current === key) {
          setStore({ ...localStore, paid: false });
          loadedKeyRef.current = key;
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  useEffect(
    () => () => {
      if (remoteRetryTimerRef.current !== null) {
        window.clearTimeout(remoteRetryTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (
      !hydrated ||
      !keyRef.current ||
      loadedKeyRef.current !== keyRef.current
    ) {
      return;
    }
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(store));
    } catch {
      // quota exceeded — ignore
    }
  }, [store, hydrated]);

  // Supabase is the durable source of truth for authenticated users. A short
  // debounce coalesces rapid chat/token updates into one normalized write.
  useEffect(() => {
    if (
      !hydrated ||
      !remoteReady ||
      !userId ||
      loadedKeyRef.current !== storageKey(userId)
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      queuedRemoteStoreRef.current = store;
      void flushRemoteSaves();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [
    flushRemoteSaves,
    store,
    hydrated,
    remoteReady,
    userId,
  ]);

  const update = useCallback((patch: Partial<GtmStore>) => {
    setStore((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  const addDirectorMessage = useCallback(
    (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      const msg = makeMessage(message);
      setStore((prev) => ({
        ...prev,
        // The durable server transcript is append-only; the browser keeps a
        // recent working window so an "infinite" conversation does not make
        // every render and localStorage write grow forever.
        directorChat: [...prev.directorChat, msg].slice(-300),
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
      updatedAt: Date.now(),
    }));
  }, []);

  const setMemoryState = useCallback(
    (
      summary: string,
      facts: MemoryFact[],
      processedMessageCount = Number.MAX_SAFE_INTEGER
    ) => {
      setStore((prev) => ({
        ...prev,
        conversationSummary: summary.slice(0, 12_000),
        memoryFacts: facts.slice(0, 120),
        // Messages arriving while the summarizer was running remain above the
        // watermark and will be consumed by the next summary.
        msgSinceContextSync: Math.max(
          0,
          prev.msgSinceContextSync - processedMessageCount
        ),
        updatedAt: Date.now(),
      }));
    },
    []
  );

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

  const createTopic = useCallback(
    (input: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now();
      const topic: Topic = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      setStore((prev) => ({
        ...prev,
        topics: [topic, ...prev.topics],
        updatedAt: now,
      }));
      return topic;
    },
    []
  );

  const updateTopic = useCallback((topicId: string, patch: Partial<Topic>) => {
    const now = Date.now();
    setStore((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) =>
        topic.id === topicId
          ? { ...topic, ...patch, id: topic.id, createdAt: topic.createdAt, updatedAt: now }
          : topic
      ),
      updatedAt: now,
    }));
  }, []);

  const deleteTopic = useCallback((topicId: string) => {
    setStore((prev) => {
      const removedVariantIds = new Set(
        prev.topicVariants
          .filter((variant) => variant.topicId === topicId)
          .map((variant) => variant.id)
      );
      return {
        ...prev,
        topics: prev.topics.filter((topic) => topic.id !== topicId),
        topicVariants: prev.topicVariants.filter(
          (variant) => variant.topicId !== topicId
        ),
        todos: prev.todos.map((todo) =>
          todo.topicVariantId && removedVariantIds.has(todo.topicVariantId)
            ? { ...todo, topicVariantId: undefined }
            : todo
        ),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const createTopicVariant = useCallback(
    (
      input: Omit<TopicVariant, 'id' | 'createdAt' | 'updatedAt'>
    ): TopicVariant => {
      const now = Date.now();
      const variant: TopicVariant = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      setStore((prev) => ({
        ...prev,
        topicVariants: [...prev.topicVariants, variant],
        updatedAt: now,
      }));
      return variant;
    },
    []
  );

  const updateTopicVariant = useCallback(
    (variantId: string, patch: Partial<TopicVariant>) => {
      const now = Date.now();
      setStore((prev) => ({
        ...prev,
        topicVariants: prev.topicVariants.map((variant) =>
          variant.id === variantId
            ? {
                ...variant,
                ...patch,
                id: variant.id,
                topicId: variant.topicId,
                createdAt: variant.createdAt,
                updatedAt: now,
              }
            : variant
        ),
        updatedAt: now,
      }));
    },
    []
  );

  const deleteTopicVariant = useCallback((variantId: string) => {
    setStore((prev) => ({
      ...prev,
      topicVariants: prev.topicVariants.filter(
        (variant) => variant.id !== variantId
      ),
      todos: prev.todos.map((todo) =>
        todo.topicVariantId === variantId
          ? { ...todo, topicVariantId: undefined }
          : todo
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  const enqueueAgentRequest = useCallback((request: PendingAgentRequest) => {
    setStore((prev) => ({
      ...prev,
      pendingAgentRequests: prev.pendingAgentRequests.some(
        (item) => item.id === request.id
      )
        ? prev.pendingAgentRequests
        : [...prev.pendingAgentRequests, request],
      updatedAt: Date.now(),
    }));
  }, []);

  const removeAgentRequests = useCallback((requestIds: string[]) => {
    const ids = new Set(requestIds);
    setStore((prev) => ({
      ...prev,
      pendingAgentRequests: prev.pendingAgentRequests.filter(
        (request) => !ids.has(request.id)
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  const clearAgentRequests = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      pendingAgentRequests: [],
      updatedAt: Date.now(),
    }));
  }, []);

  const enqueueAgentActionJob = useCallback((job: AgentActionJob) => {
    setStore((prev) => ({
      ...prev,
      agentActionJobs: prev.agentActionJobs.some((item) => item.id === job.id)
        ? prev.agentActionJobs
        : [...prev.agentActionJobs, job],
      updatedAt: Date.now(),
    }));
  }, []);

  const updateAgentActionJob = useCallback(
    (jobId: string, patch: Partial<AgentActionJob>) => {
      setStore((prev) => ({
        ...prev,
        agentActionJobs: prev.agentActionJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...patch,
                id: job.id,
                createdAt: job.createdAt,
                updatedAt: Date.now(),
              }
            : job
        ),
        updatedAt: Date.now(),
      }));
    },
    []
  );

  const removeAgentActionJob = useCallback((jobId: string) => {
    setStore((prev) => ({
      ...prev,
      agentActionJobs: prev.agentActionJobs.filter((job) => job.id !== jobId),
      updatedAt: Date.now(),
    }));
  }, []);

  const createArtifact = useCallback(
    (
      input: Omit<
        AgentArtifact,
        'id' | 'version' | 'createdAt' | 'updatedAt'
      >
    ) => {
      const now = Date.now();
      const artifact: AgentArtifact = {
        ...input,
        markdown: input.markdown.slice(0, 120_000),
        id: crypto.randomUUID(),
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      setStore((prev) => {
        const artifacts = [artifact, ...prev.artifacts].slice(0, 20);
        const retainedIds = new Set(artifacts.map((item) => item.id));
        return {
          ...prev,
          artifacts,
          // Do not leave dead deep links in a longer chat transcript when an
          // old large artifact ages out of the bounded local cache.
          directorChat: prev.directorChat.map((message) =>
            message.card?.kind === 'artifact' &&
            !retainedIds.has(message.card.artifactId)
              ? {
                  ...message,
                  card: {
                    kind: 'agent-task' as const,
                    label: `${message.card.title}（已从本地工作区归档）`,
                    status: 'done' as const,
                  },
                }
              : message
          ),
          agentNotifications: prev.agentNotifications.map((notification) =>
            notification.artifactId &&
            !retainedIds.has(notification.artifactId)
              ? { ...notification, artifactId: undefined }
              : notification
          ),
          updatedAt: now,
        };
      });
      return artifact;
    },
    []
  );

  const updateArtifact = useCallback(
    (artifactId: string, patch: Partial<AgentArtifact>) => {
      const now = Date.now();
      setStore((prev) => ({
        ...prev,
        artifacts: prev.artifacts.map((artifact) =>
          artifact.id === artifactId
            ? {
                ...artifact,
                ...patch,
                markdown:
                  typeof patch.markdown === 'string'
                    ? patch.markdown.slice(0, 120_000)
                    : artifact.markdown,
                id: artifact.id,
                createdAt: artifact.createdAt,
                version:
                  patch.markdown && patch.markdown !== artifact.markdown
                    ? artifact.version + 1
                    : artifact.version,
                updatedAt: now,
              }
            : artifact
        ),
        updatedAt: now,
      }));
    },
    []
  );

  const addAgentNotification = useCallback(
    (
      input: Omit<AgentNotification, 'id' | 'read' | 'createdAt'>
    ): AgentNotification => {
      const notification: AgentNotification = {
        ...input,
        id: crypto.randomUUID(),
        read: false,
        createdAt: Date.now(),
      };
      setStore((prev) => ({
        ...prev,
        agentNotifications: [notification, ...prev.agentNotifications].slice(
          0,
          40
        ),
        updatedAt: Date.now(),
      }));
      return notification;
    },
    []
  );

  const markAgentNotificationRead = useCallback((notificationId: string) => {
    setStore((prev) => ({
      ...prev,
      agentNotifications: prev.agentNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  const createTodo = useCallback((input: Omit<Todo, 'id'>): Todo => {
    const todo = { ...input, id: crypto.randomUUID() };
    setStore((prev) => ({
      ...prev,
      todos: [...prev.todos, todo].sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
          a.channelId.localeCompare(b.channelId)
      ),
      planReady: true,
      updatedAt: Date.now(),
    }));
    return todo;
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
        addDirectorMessage,
        patchDirectorMessage,
        setProfiles,
        setMemoryState,
        setStrategy,
        upsertChannelStrategy,
        setChannels,
        createTopic,
        updateTopic,
        deleteTopic,
        createTopicVariant,
        updateTopicVariant,
        deleteTopicVariant,
        enqueueAgentRequest,
        removeAgentRequests,
        clearAgentRequests,
        enqueueAgentActionJob,
        updateAgentActionJob,
        removeAgentActionJob,
        createArtifact,
        updateArtifact,
        addAgentNotification,
        markAgentNotificationRead,
        createTodo,
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
