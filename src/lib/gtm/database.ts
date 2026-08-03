import 'server-only';

import { getServiceSupabase } from '@/lib/supabase';
import {
  createInitialStore,
  GTM_STORE_VERSION,
  type ChatMessage,
  type ChannelRecommendationResponse,
  type GtmStore,
  type MessageCard,
  type Todo,
  type Topic,
  type TopicVariant,
} from './types';

type UserProfile = {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type ProjectRecord = {
  id: string;
  owner_id: string;
  store_version: number;
  plan_ready: boolean;
  start_date: string | null;
  state_revision: string | number;
  state_snapshot: unknown;
  updated_at: string;
  atomic_state_available: boolean;
  target_markets?: unknown;
};

type DatabaseError = { message: string; code?: string } | null;

function fail(message: string, error: DatabaseError) {
  if (error) throw new Error(`${message}: ${error.message}`);
}

function isMissingSchema(
  error: DatabaseError,
  fragments: string[]
): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    error.code === '42703' ||
    error.code === '42P01' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST205' ||
    fragments.some((fragment) => message.includes(fragment.toLowerCase()))
  );
}

function toMillis(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function toIso(value: number | undefined): string {
  const date = new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function ensureAppUser(clerkUserId: string, profile: UserProfile = {}) {
  const supabase = getServiceSupabase();
  const row: Record<string, string> = { clerk_user_id: clerkUserId };
  if (profile.email) row.email = profile.email;
  if (profile.displayName) row.display_name = profile.displayName;
  if (profile.avatarUrl) row.avatar_url = profile.avatarUrl;

  const { data, error } = await supabase
    .from('app_users')
    .upsert(row, { onConflict: 'clerk_user_id' })
    .select('id, clerk_user_id')
    .single();
  fail('Failed to ensure application user', error);
  return data as { id: string; clerk_user_id: string };
}

export async function ensureDefaultProject(clerkUserId: string): Promise<{
  user: { id: string; clerk_user_id: string };
  project: ProjectRecord;
}> {
  const supabase = getServiceSupabase();
  const user = await ensureAppUser(clerkUserId);
  const atomicSelect = await supabase
    .from('gtm_projects')
    .select(
      'id, owner_id, store_version, plan_ready, start_date, state_revision, state_snapshot, updated_at'
    )
    .eq('owner_id', user.id)
    .eq('slug', 'default')
    .maybeSingle();
  const atomicStateAvailable = !isMissingSchema(atomicSelect.error, [
    'state_revision',
    'state_snapshot',
  ]);
  if (atomicStateAvailable) {
    fail('Failed to load default project', atomicSelect.error);
    if (atomicSelect.data) {
      return {
        user,
        project: {
          ...(atomicSelect.data as Omit<
            ProjectRecord,
            'atomic_state_available'
          >),
          atomic_state_available: true,
        },
      };
    }
    const atomicInsert = await supabase
      .from('gtm_projects')
      .insert({ owner_id: user.id, slug: 'default', name: 'My GTM Project' })
      .select(
        'id, owner_id, store_version, plan_ready, start_date, state_revision, state_snapshot, updated_at'
      )
      .single();
    fail('Failed to create default project', atomicInsert.error);
    if (!atomicInsert.data) {
      throw new Error('Failed to create default project: no row returned');
    }
    return {
      user,
      project: {
        ...(atomicInsert.data as Omit<
          ProjectRecord,
          'atomic_state_available'
        >),
        atomic_state_available: true,
      },
    };
  }

  // D6 compatibility: installations created before the Agent migrations do
  // not have the atomic snapshot columns yet. Keep the product usable against
  // the normalized legacy schema until the migration is applied.
  const legacySelect = await supabase
    .from('gtm_projects')
    .select('id, owner_id, store_version, plan_ready, start_date, updated_at')
    .eq('owner_id', user.id)
    .eq('slug', 'default')
    .maybeSingle();
  fail('Failed to load legacy default project', legacySelect.error);
  let legacyProject = legacySelect.data;
  if (!legacyProject) {
    const legacyInsert = await supabase
      .from('gtm_projects')
      .insert({ owner_id: user.id, slug: 'default', name: 'My GTM Project' })
      .select('id, owner_id, store_version, plan_ready, start_date, updated_at')
      .single();
    fail('Failed to create legacy default project', legacyInsert.error);
    legacyProject = legacyInsert.data;
  }
  if (!legacyProject) {
    throw new Error('Failed to create legacy default project');
  }
  return {
    user,
    project: {
      ...legacyProject,
      state_revision: legacyProject.updated_at,
      state_snapshot: null,
      atomic_state_available: false,
    } as ProjectRecord,
  };
}

export async function loadMarketStrategyReport(
  clerkUserId: string,
  launchId: string
): Promise<ChannelRecommendationResponse | null> {
  const supabase = getServiceSupabase();
  const { project } = await ensureDefaultProject(clerkUserId);
  const { data, error } = await supabase
    .from('market_strategy_reports')
    .select('report')
    .eq('project_id', project.id)
    .eq('launch_id', launchId)
    .maybeSingle();
  if (
    error &&
    !isMissingSchema(error, [
      'public.market_strategy_reports',
      "table 'public.market_strategy_reports'",
    ])
  ) {
    fail('Failed to load market strategy report', error);
  }
  if (data?.report) {
    return data.report as ChannelRecommendationResponse;
  }

  // Compatibility path for deployments where the new report table has not
  // reached PostgREST's schema cache yet. The existing Agent job table stores
  // the same complete JSON payload under a unique project/build key.
  const fallback = await supabase
    .from('agent_work_jobs')
    .select('result_summary')
    .eq('project_id', project.id)
    .eq('build_key', `free-market-strategy-report:${launchId}`)
    .maybeSingle();
  fail('Failed to load compatible market strategy report', fallback.error);
  const fallbackPayload = fallback.data?.result_summary as
    | { report?: ChannelRecommendationResponse }
    | null
    | undefined;
  return fallbackPayload?.report ?? null;
}

/**
 * Insert the entire report once. No incremental writes and no update/upsert:
 * a retry returns the winning row created by the first request.
 */
export async function saveMarketStrategyReportOnce(input: {
  clerkUserId: string;
  launchId: string;
  locale: 'zh' | 'en';
  productName: string;
  report: ChannelRecommendationResponse;
}): Promise<{ report: ChannelRecommendationResponse; reused: boolean }> {
  const supabase = getServiceSupabase();
  const { project } = await ensureDefaultProject(input.clerkUserId);
  const insert = await supabase
    .from('market_strategy_reports')
    .insert({
      project_id: project.id,
      launch_id: input.launchId,
      locale: input.locale,
      product_name: input.productName.slice(0, 200),
      report_markdown: input.report.reportMarkdown,
      report: input.report,
    })
    .select('report')
    .single();
  if (!insert.error && insert.data?.report) {
    return {
      report: insert.data.report as ChannelRecommendationResponse,
      reused: false,
    };
  }
  const reportTableMissing = isMissingSchema(insert.error, [
    'public.market_strategy_reports',
    "table 'public.market_strategy_reports'",
  ]);
  if (insert.error?.code !== '23505' && !reportTableMissing) {
    fail('Failed to save market strategy report', insert.error);
  }
  if (reportTableMissing) {
    const buildKey = `free-market-strategy-report:${input.launchId}`;
    const compatibleInsert = await supabase
      .from('agent_work_jobs')
      .insert({
        project_id: project.id,
        clerk_user_id: input.clerkUserId,
        build_key: buildKey,
        locale: input.locale,
        kind: 'market_strategy_report',
        status: 'completed',
        current_step: 'complete',
        progress_completed: 1,
        progress_total: 1,
        input_snapshot: {
          launchId: input.launchId,
          productName: input.productName.slice(0, 200),
        },
        result_summary: {
          report: input.report,
          reportMarkdown: input.report.reportMarkdown,
        },
        completed_at: new Date().toISOString(),
      })
      .select('result_summary')
      .single();
    if (!compatibleInsert.error && compatibleInsert.data?.result_summary) {
      return { report: input.report, reused: false };
    }
    if (compatibleInsert.error?.code !== '23505') {
      fail(
        'Failed to save compatible market strategy report',
        compatibleInsert.error
      );
    }
    const compatibleExisting = await supabase
      .from('agent_work_jobs')
      .select('result_summary')
      .eq('project_id', project.id)
      .eq('build_key', buildKey)
      .single();
    fail(
      'Failed to reload compatible market strategy report',
      compatibleExisting.error
    );
    const compatiblePayload = compatibleExisting.data?.result_summary as
      | { report?: ChannelRecommendationResponse }
      | null
      | undefined;
    if (!compatiblePayload?.report) {
      throw new Error(
        'Compatible market strategy report resolved without a stored payload'
      );
    }
    return { report: compatiblePayload.report, reused: true };
  }
  const existing = await supabase
    .from('market_strategy_reports')
    .select('report')
    .eq('project_id', project.id)
    .eq('launch_id', input.launchId)
    .single();
  fail('Failed to reload market strategy report', existing.error);
  if (!existing.data?.report) {
    throw new Error('Market strategy report conflict resolved without a stored row');
  }
  return {
    report: existing.data.report as ChannelRecommendationResponse,
    reused: true,
  };
}

export async function loadGtmStore(clerkUserId: string): Promise<{
  store: GtmStore;
  hasRemoteData: boolean;
  revision: string;
}> {
  const supabase = getServiceSupabase();
  const { project } = await ensureDefaultProject(clerkUserId);
  const projectId = project.id as string;
  const subscriptionRes = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', clerkUserId)
    .maybeSingle();
  fail('Failed to load subscription', subscriptionRes.error);
  const paidStatuses = new Set(['active', 'trialing']);
  const paid = paidStatuses.has(subscriptionRes.data?.status ?? '');
  if (isGtmStore(project.state_snapshot)) {
    return {
      store: {
        ...project.state_snapshot,
        version: GTM_STORE_VERSION,
        // The subscription table, not the JSON supplied by a browser, owns
        // access control.
        paid,
      },
      hasRemoteData: true,
      revision: String(project.state_revision ?? 0),
    };
  }

  const [
    contextRes,
    strategyRes,
    channelStrategiesRes,
    channelsRes,
    topicsRes,
    topicVariantsRes,
    todosRes,
    conversationsRes,
  ] =
    await Promise.all([
      supabase.from('project_contexts').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('market_strategies').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('channel_strategies').select('*').eq('project_id', projectId),
      supabase.from('project_channels').select('channel_id').eq('project_id', projectId),
      supabase.from('topics').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('topic_variants').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('todos').select('*').eq('project_id', projectId).order('day_index'),
      supabase.from('conversations').select('id, kind, topic_key').eq('project_id', projectId),
    ]);

  fail('Failed to load project context', contextRes.error);
  fail('Failed to load market strategy', strategyRes.error);
  fail('Failed to load channel strategies', channelStrategiesRes.error);
  fail('Failed to load channels', channelsRes.error);
  if (
    topicsRes.error &&
    !isMissingSchema(topicsRes.error, ['public.topics', "table 'public.topics'"])
  ) {
    fail('Failed to load topics', topicsRes.error);
  }
  if (
    topicVariantsRes.error &&
    !isMissingSchema(topicVariantsRes.error, [
      'public.topic_variants',
      "table 'public.topic_variants'",
    ])
  ) {
    fail('Failed to load topic variants', topicVariantsRes.error);
  }
  fail('Failed to load todos', todosRes.error);
  fail('Failed to load conversations', conversationsRes.error);

  const conversations = (conversationsRes.data ?? []) as Array<{
    id: string;
    kind: 'director' | 'todo_specialist';
    topic_key: string;
  }>;
  const conversationIds = conversations.map((item) => item.id);
  let rawMessageRows: unknown[] = [];
  let messageReadError: DatabaseError = null;
  if (conversationIds.length) {
    const enrichedMessagesRes = await supabase
        .from('messages')
        .select('id, conversation_id, role, content, card, context_ref, reply_to_message_ids, lane, agent_job_id, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(600);
    if (
      isMissingSchema(enrichedMessagesRes.error, [
        'context_ref',
        'reply_to_message_ids',
        'agent_job_id',
        'lane',
      ])
    ) {
      const legacyMessagesRes = await supabase
        .from('messages')
        .select('id, conversation_id, role, content, card, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(600);
      rawMessageRows = legacyMessagesRes.data ?? [];
      messageReadError = legacyMessagesRes.error;
    } else {
      rawMessageRows = enrichedMessagesRes.data ?? [];
      messageReadError = enrichedMessagesRes.error;
    }
  }
  fail('Failed to load messages', messageReadError);

  const messagesByConversation = new Map<string, ChatMessage[]>();
  const messageRows = rawMessageRows as Array<{
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    card?: unknown;
    context_ref?: ChatMessage['contextRef'] | null;
    reply_to_message_ids?: unknown;
    lane?: ChatMessage['lane'] | null;
    agent_job_id?: string | null;
    created_at: string;
  }>;
  for (const row of messageRows) {
    const list = messagesByConversation.get(row.conversation_id) ?? [];
    list.push({
      id: row.id,
      role: row.role as ChatMessage['role'],
      content: row.content,
      card: (row.card ?? undefined) as MessageCard | undefined,
      contextRef: row.context_ref ?? undefined,
      replyToMessageIds: Array.isArray(row.reply_to_message_ids)
        ? row.reply_to_message_ids
        : undefined,
      lane: row.lane ?? undefined,
      agentJobId: row.agent_job_id ?? undefined,
      createdAt: toMillis(row.created_at),
    });
    messagesByConversation.set(row.conversation_id, list);
  }
  for (const list of messagesByConversation.values()) {
    list.sort((a, b) => a.createdAt - b.createdAt);
  }

  const directorConversation = conversations.find((item) => item.kind === 'director');
  const todoChats: Record<string, ChatMessage[]> = {};
  for (const conversation of conversations) {
    if (conversation.kind === 'todo_specialist') {
      todoChats[conversation.topic_key] = messagesByConversation.get(conversation.id) ?? [];
    }
  }

  const context = contextRes.data;
  const strategy = strategyRes.data;
  const channelStrategies: GtmStore['channelStrategies'] = {};
  for (const row of channelStrategiesRes.data ?? []) {
    channelStrategies[row.channel_id] = {
      channelId: row.channel_id,
      channelName: row.channel_name,
      positioning: row.positioning,
      direction: row.direction,
      contentPillars: Array.isArray(row.content_pillars) ? row.content_pillars : [],
      markdown: row.markdown,
      updatedAt: toMillis(row.strategy_updated_at),
    };
  }

  const topics: Topic[] = (topicsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    source: row.source as Topic['source'],
    sourceLabel: row.source_label ?? undefined,
    targetAudience: row.target_audience,
    painPoint: row.pain_point,
    corePoint: row.core_point,
    priority: row.priority as Topic['priority'],
    status: row.status as Topic['status'],
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  }));

  const topicVariants: TopicVariant[] = (topicVariantsRes.data ?? []).map(
    (row) => ({
      id: row.id,
      topicId: row.topic_id,
      channelId: row.channel_id,
      channelName: row.channel_name,
      hook: row.hook,
      angle: row.angle,
      format: row.content_format,
      cta: row.cta,
      status: row.status as TopicVariant['status'],
      createdAt: toMillis(row.created_at),
      updatedAt: toMillis(row.updated_at),
    })
  );

  const todos: Todo[] = (todosRes.data ?? []).map((row) => ({
    id: row.id,
    topicVariantId: row.topic_variant_id ?? undefined,
    channelId: row.channel_id,
    channelName: row.channel_name,
    dayIndex: row.day_index,
    date: row.due_date,
    time: row.due_time ? String(row.due_time).slice(0, 5) : undefined,
    title: row.title,
    brief: row.brief,
    purpose: row.purpose ?? undefined,
    pillar: row.pillar ?? undefined,
    taskType: row.task_type ?? undefined,
    phase: row.phase ?? undefined,
    market: row.market ?? undefined,
    targetMarketId: row.target_market_id ?? undefined,
    outputLocale: row.output_locale ?? undefined,
    audience: row.audience ?? undefined,
    status: row.status as Todo['status'],
    launchStatus: row.launch_status ?? undefined,
    revision:
      typeof row.revision === 'number' ? row.revision : Number(row.revision ?? 1),
    content:
      row.content_title || row.content_body
        ? { title: row.content_title ?? '', body: row.content_body ?? '' }
        : undefined,
    contentStatus: row.content_status as Todo['contentStatus'],
    publishStatus:
      (row.publish_status as Todo['publishStatus']) ?? 'not_started',
    publishedUrl: row.published_url ?? undefined,
    publishedAt: row.published_at ? toMillis(row.published_at) : undefined,
    publishError: row.publish_error ?? undefined,
    trackingStatus:
      (row.tracking_status as Todo['trackingStatus']) ?? 'not_started',
    metricSnapshots: Array.isArray(row.metric_snapshots)
      ? (row.metric_snapshots as Todo['metricSnapshots'])
      : [],
  }));

  const normalizedStore: GtmStore = {
    ...createInitialStore(),
    version: GTM_STORE_VERSION,
    paid,
    planReady: Boolean(project.plan_ready),
    startDate: project.start_date ?? undefined,
    userProfileDoc: context?.user_profile_doc ?? '',
    projectProfileDoc: context?.project_profile_doc ?? '',
    targetMarkets: Array.isArray(project.target_markets)
      ? project.target_markets
      : [],
    conversationSummary: context?.conversation_summary ?? '',
    memoryFacts: Array.isArray(context?.memory_facts)
      ? context.memory_facts
      : [],
    pendingAgentRequests: Array.isArray(context?.pending_agent_requests)
      ? context.pending_agent_requests
      : [],
    agentActionJobs: Array.isArray(context?.agent_action_jobs)
      ? context.agent_action_jobs
      : [],
    artifacts: Array.isArray(context?.artifacts) ? context.artifacts : [],
    agentNotifications: Array.isArray(context?.agent_notifications)
      ? context.agent_notifications
      : [],
    lastReflectionAt: context?.last_reflection_at
      ? toMillis(context.last_reflection_at)
      : undefined,
    msgSinceContextSync: context?.messages_since_sync ?? 0,
    directorChat: directorConversation
      ? messagesByConversation.get(directorConversation.id) ?? []
      : [],
    strategy: strategy
      ? {
          overviewMarkdown: strategy.overview_markdown,
          goal: strategy.goal,
          updatedAt: toMillis(strategy.strategy_updated_at),
        }
      : undefined,
    channelStrategies,
    channels: (channelsRes.data ?? []).map((row) => row.channel_id),
    topics,
    topicVariants,
    todos,
    todoChats,
    updatedAt: toMillis(project.updated_at),
  };
  return {
    store: normalizedStore,
    revision: String(project.state_revision ?? 0),
    hasRemoteData: Boolean(
      context ||
        strategy ||
        topics.length ||
        topicVariants.length ||
        todos.length ||
        conversations.length ||
        Object.keys(channelStrategies).length ||
        normalizedStore.channels.length
    ),
  };
}

export class GtmStateConflictError extends Error {
  constructor() {
    super('GTM state revision conflict');
    this.name = 'GtmStateConflictError';
  }
}

async function deleteStaleRows(
  table: string,
  projectId: string,
  idColumn: string,
  desiredIds: Set<string>,
  optionalWhenMissing = false
) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from(table).select(idColumn).eq('project_id', projectId);
  if (optionalWhenMissing && isMissingSchema(error, [table])) return;
  fail(`Failed to inspect ${table}`, error);
  const stale = ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((row) => String(row[idColumn]))
    .filter((id) => !desiredIds.has(id));
  if (!stale.length) return;
  // A client that saves before it finished hydrating sends empty collections.
  // Mirroring that would erase everything, so a wholesale wipe is never synced.
  if (desiredIds.size === 0) {
    console.warn(
      `[gtm/state] refused to delete all ${stale.length} ${table} rows for project ${projectId}: incoming store had none`
    );
    return;
  }
  const deleteRes = await supabase.from(table).delete().eq('project_id', projectId).in(idColumn, stale);
  if (optionalWhenMissing && isMissingSchema(deleteRes.error, [table])) return;
  fail(`Failed to remove stale ${table}`, deleteRes.error);
}

async function syncMessages(conversationId: string, messages: ChatMessage[]) {
  const supabase = getServiceSupabase();
  if (messages.length) {
    const enrichedWrite = await supabase.from('messages').upsert(
      messages.map((message) => ({
        id: message.id,
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        card: message.card ?? null,
        context_ref: message.contextRef ?? null,
        reply_to_message_ids: message.replyToMessageIds ?? [],
        lane: message.lane ?? null,
        agent_job_id: message.agentJobId ?? null,
        created_at: toIso(message.createdAt),
      })),
      { onConflict: 'conversation_id,id' }
    );
    let messageError: DatabaseError = enrichedWrite.error;
    if (
      isMissingSchema(enrichedWrite.error, [
        'context_ref',
        'reply_to_message_ids',
        'lane',
        'agent_job_id',
      ])
    ) {
      const legacyWrite = await supabase.from('messages').upsert(
        messages.map((message) => ({
          id: message.id,
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          card: message.card ?? null,
          created_at: toIso(message.createdAt),
        })),
        { onConflict: 'conversation_id,id' }
      );
      messageError = legacyWrite.error;
    }
    fail('Failed to save conversation messages', messageError);
  }

  // Conversation history is append-only. The browser intentionally keeps only
  // a recent working window, so absence from a client snapshot must never be
  // interpreted as a request to delete older durable messages.
}

export async function saveGtmStore(
  clerkUserId: string,
  store: GtmStore,
  expectedRevision?: string
): Promise<string> {
  const supabase = getServiceSupabase();
  const { project } = await ensureDefaultProject(clerkUserId);
  const projectId = project.id as string;
  const currentRevision = expectedRevision ?? String(project.state_revision ?? 0);
  let nextRevision: string;
  if (project.atomic_state_available) {
    try {
      nextRevision = (BigInt(currentRevision) + BigInt(1)).toString();
    } catch {
      throw new GtmStateConflictError();
    }

    // This single-row compare-and-swap is the canonical commit. Readers only
    // restore business state from state_snapshot, so they can never observe a
    // revision paired with a half-written set of normalized tables.
    const projectUpdate = await supabase
      .from('gtm_projects')
      .update({
        store_version: GTM_STORE_VERSION,
        plan_ready: Boolean(store.planReady),
        start_date: store.startDate ?? null,
        state_revision: nextRevision,
        state_snapshot: store,
        directory_launch_kit: store.launch?.directoryLaunchKit ?? null,
        target_markets: store.targetMarkets ?? [],
      })
      .eq('id', projectId)
      .eq('state_revision', currentRevision)
      .select('state_revision')
      .maybeSingle();
    fail('Failed to save project', projectUpdate.error);
    if (String(projectUpdate.data?.state_revision ?? '') !== nextRevision) {
      throw new GtmStateConflictError();
    }
  } else {
    const legacyProjectUpdate = await supabase
      .from('gtm_projects')
      .update({
        store_version: GTM_STORE_VERSION,
        plan_ready: Boolean(store.planReady),
        start_date: store.startDate ?? null,
        target_markets: store.targetMarkets ?? [],
      })
      .eq('id', projectId)
      .eq('updated_at', currentRevision)
      .select('updated_at')
      .maybeSingle();
    fail('Failed to save legacy project', legacyProjectUpdate.error);
    if (!legacyProjectUpdate.data?.updated_at) {
      throw new GtmStateConflictError();
    }
    nextRevision = String(legacyProjectUpdate.data.updated_at);
  }

  // With the atomic migration these tables are queryable projections and the
  // snapshot above remains canonical. On a legacy installation they are still
  // the only durable representation, so projection failures must reach the
  // caller instead of producing a false-success response.
  try {
  const contextRes = await supabase.from('project_contexts').upsert(
    {
      project_id: projectId,
      user_profile_doc: store.userProfileDoc ?? '',
      project_profile_doc: store.projectProfileDoc ?? '',
      conversation_summary: store.conversationSummary ?? '',
      memory_facts: store.memoryFacts ?? [],
      pending_agent_requests: store.pendingAgentRequests ?? [],
      agent_action_jobs: store.agentActionJobs ?? [],
      artifacts: store.artifacts ?? [],
      agent_notifications: store.agentNotifications ?? [],
      last_reflection_at: store.lastReflectionAt
        ? toIso(store.lastReflectionAt)
        : null,
      messages_since_sync: Math.max(0, store.msgSinceContextSync ?? 0),
    },
    { onConflict: 'project_id' }
  );
  let contextError: DatabaseError = contextRes.error;
  if (
    isMissingSchema(contextRes.error, [
      'conversation_summary',
      'memory_facts',
      'pending_agent_requests',
      'agent_action_jobs',
      'artifacts',
      'agent_notifications',
      'last_reflection_at',
    ])
  ) {
    const legacyContextRes = await supabase.from('project_contexts').upsert(
      {
        project_id: projectId,
        user_profile_doc: store.userProfileDoc ?? '',
        project_profile_doc: store.projectProfileDoc ?? '',
        messages_since_sync: Math.max(0, store.msgSinceContextSync ?? 0),
      },
      { onConflict: 'project_id' }
    );
    contextError = legacyContextRes.error;
  }
  fail('Failed to save project context', contextError);

  if (store.strategy) {
    const strategyRes = await supabase.from('market_strategies').upsert(
      {
        project_id: projectId,
        overview_markdown: store.strategy.overviewMarkdown,
        goal: store.strategy.goal,
        strategy_updated_at: toIso(store.strategy.updatedAt),
      },
      { onConflict: 'project_id' }
    );
    fail('Failed to save market strategy', strategyRes.error);
  } else {
    // Same reasoning as deleteStaleRows: an incoming store without a strategy is
    // far more likely to be a client that has not hydrated than a deliberate
    // clear, so the stored strategy is kept rather than dropped.
    const existing = await supabase
      .from('market_strategies')
      .select('project_id')
      .eq('project_id', projectId)
      .maybeSingle();
    fail('Failed to inspect market strategy', existing.error);
    if (existing.data) {
      console.warn(
        `[gtm/state] kept stored market strategy for project ${projectId}: incoming store had none`
      );
    }
  }

  const channelDocs = Object.values(store.channelStrategies ?? {});
  if (channelDocs.length) {
    const { error } = await supabase.from('channel_strategies').upsert(
      channelDocs.map((doc) => ({
        project_id: projectId,
        channel_id: doc.channelId,
        channel_name: doc.channelName,
        positioning: doc.positioning,
        direction: doc.direction,
        content_pillars: doc.contentPillars,
        markdown: doc.markdown,
        strategy_updated_at: toIso(doc.updatedAt),
      })),
      { onConflict: 'project_id,channel_id' }
    );
    fail('Failed to save channel strategies', error);
  }
  await deleteStaleRows(
    'channel_strategies',
    projectId,
    'channel_id',
    new Set(channelDocs.map((doc) => doc.channelId))
  );

  if (store.channels.length) {
    const { error } = await supabase.from('project_channels').upsert(
      store.channels.map((channelId) => ({ project_id: projectId, channel_id: channelId })),
      { onConflict: 'project_id,channel_id' }
    );
    fail('Failed to save selected channels', error);
  }
  await deleteStaleRows('project_channels', projectId, 'channel_id', new Set(store.channels));

  const topics = store.topics ?? [];
  const topicIds = new Set(topics.map((topic) => topic.id));
  const topicVariants = (store.topicVariants ?? []).filter((variant) =>
    topicIds.has(variant.topicId)
  );

  if (topics.length) {
    const { error } = await supabase.from('topics').upsert(
      topics.map((topic) => ({
        id: topic.id,
        project_id: projectId,
        title: topic.title,
        source: topic.source,
        source_label: topic.sourceLabel ?? null,
        target_audience: topic.targetAudience,
        pain_point: topic.painPoint,
        core_point: topic.corePoint,
        priority: topic.priority,
        status: topic.status,
        created_at: toIso(topic.createdAt),
        updated_at: toIso(topic.updatedAt),
      })),
      { onConflict: 'project_id,id' }
    );
    if (!isMissingSchema(error, ['public.topics', "table 'public.topics'"])) {
      fail('Failed to save topics', error);
    }
  }

  if (topicVariants.length) {
    const { error } = await supabase.from('topic_variants').upsert(
      topicVariants.map((variant) => ({
        id: variant.id,
        project_id: projectId,
        topic_id: variant.topicId,
        channel_id: variant.channelId,
        channel_name: variant.channelName,
        hook: variant.hook,
        angle: variant.angle,
        content_format: variant.format,
        cta: variant.cta,
        status: variant.status,
        created_at: toIso(variant.createdAt),
        updated_at: toIso(variant.updatedAt),
      })),
      { onConflict: 'project_id,id' }
    );
    if (
      !isMissingSchema(error, [
        'public.topic_variants',
        "table 'public.topic_variants'",
      ])
    ) {
      fail('Failed to save topic variants', error);
    }
  }

  const validVariantIds = new Set(topicVariants.map((variant) => variant.id));
  if (store.todos.length) {
    const todoWrite = await supabase.from('todos').upsert(
      store.todos.map((todo) => ({
        id: todo.id,
        project_id: projectId,
        topic_variant_id:
          todo.topicVariantId && validVariantIds.has(todo.topicVariantId)
            ? todo.topicVariantId
            : null,
        channel_id: todo.channelId,
        channel_name: todo.channelName,
        day_index: todo.dayIndex,
        due_date: todo.date,
        due_time: todo.time ?? null,
        title: todo.title,
        brief: todo.brief,
        purpose: todo.purpose ?? null,
        pillar: todo.pillar ?? null,
        task_type: todo.taskType ?? null,
        phase: todo.phase ?? null,
        market: todo.market ?? null,
        target_market_id: todo.targetMarketId ?? null,
        output_locale: todo.outputLocale ?? null,
        audience: todo.audience ?? null,
        status: todo.status,
        launch_status: todo.launchStatus ?? 'planned',
        revision: Math.max(1, todo.revision ?? 1),
        content_title: todo.content?.title ?? null,
        content_body: todo.content?.body ?? null,
        content_status: todo.contentStatus,
        publish_status: todo.publishStatus ?? 'not_started',
        published_url: todo.publishedUrl ?? null,
        published_at: todo.publishedAt ? toIso(todo.publishedAt) : null,
        publish_error: todo.publishError ?? null,
        tracking_status: todo.trackingStatus ?? 'not_started',
        metric_snapshots: todo.metricSnapshots ?? [],
      })),
      { onConflict: 'project_id,id' }
    );
    let todoError: DatabaseError = todoWrite.error;
    if (
      isMissingSchema(todoWrite.error, [
        'purpose',
        'pillar',
        'task_type',
        'launch_status',
        'revision',
        'target_market_id',
        'output_locale',
      ])
    ) {
      const preLaunchWrite = await supabase.from('todos').upsert(
        store.todos.map((todo) => ({
          id: todo.id,
          project_id: projectId,
          topic_variant_id:
            todo.topicVariantId && validVariantIds.has(todo.topicVariantId)
              ? todo.topicVariantId
              : null,
          channel_id: todo.channelId,
          channel_name: todo.channelName,
          day_index: todo.dayIndex,
          due_date: todo.date,
          due_time: todo.time ?? null,
          title: todo.title,
          brief: todo.brief,
          phase: todo.phase ?? null,
          market: todo.market ?? null,
          audience: todo.audience ?? null,
          status: todo.status,
          content_title: todo.content?.title ?? null,
          content_body: todo.content?.body ?? null,
          content_status: todo.contentStatus,
          publish_status: todo.publishStatus ?? 'not_started',
          published_url: todo.publishedUrl ?? null,
          published_at: todo.publishedAt ? toIso(todo.publishedAt) : null,
          publish_error: todo.publishError ?? null,
          tracking_status: todo.trackingStatus ?? 'not_started',
          metric_snapshots: todo.metricSnapshots ?? [],
        })),
        { onConflict: 'project_id,id' }
      );
      todoError = preLaunchWrite.error;
    }
    if (
      isMissingSchema(todoError, [
        'topic_variant_id',
        'publish_status',
        'published_url',
        'published_at',
        'publish_error',
        'tracking_status',
        'metric_snapshots',
      ])
    ) {
      const legacyTodoWrite = await supabase.from('todos').upsert(
        store.todos.map((todo) => ({
          id: todo.id,
          project_id: projectId,
          channel_id: todo.channelId,
          channel_name: todo.channelName,
          day_index: todo.dayIndex,
          due_date: todo.date,
          due_time: todo.time ?? null,
          title: todo.title,
          brief: todo.brief,
          phase: todo.phase ?? null,
          market: todo.market ?? null,
          audience: todo.audience ?? null,
          status: todo.status,
          content_title: todo.content?.title ?? null,
          content_body: todo.content?.body ?? null,
          content_status: todo.contentStatus,
        })),
        { onConflict: 'project_id,id' }
      );
      todoError = legacyTodoWrite.error;
    }
    fail('Failed to save todos', todoError);
  }
  await deleteStaleRows('todos', projectId, 'id', new Set(store.todos.map((todo) => todo.id)));

  // Todos must first drop references to variants they no longer use. Then
  // stale variants can be removed before their parent topics.
  await deleteStaleRows(
    'topic_variants',
    projectId,
    'id',
    new Set(topicVariants.map((variant) => variant.id)),
    true
  );
  await deleteStaleRows(
    'topics',
    projectId,
    'id',
    new Set(topics.map((topic) => topic.id)),
    true
  );

  const conversationSeeds = [
    { project_id: projectId, kind: 'director', topic_key: 'director', title: 'Marketing Director' },
    ...Object.keys(store.todoChats).map((todoId) => ({
      project_id: projectId,
      kind: 'todo_specialist',
      topic_key: todoId,
      title: 'Channel Specialist',
    })),
  ];
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .upsert(conversationSeeds, { onConflict: 'project_id,kind,topic_key' })
    .select('id, kind, topic_key');
  fail('Failed to save conversations', conversationsError);

  const expectedTodoTopics = new Set(Object.keys(store.todoChats));
  const { data: existingTodoConversations, error: existingConversationsError } = await supabase
    .from('conversations')
    .select('id, topic_key')
    .eq('project_id', projectId)
    .eq('kind', 'todo_specialist');
  fail('Failed to inspect todo conversations', existingConversationsError);
  const staleConversationIds = (existingTodoConversations ?? [])
    .filter((item) => !expectedTodoTopics.has(item.topic_key))
    .map((item) => item.id);
  if (staleConversationIds.length && expectedTodoTopics.size === 0) {
    // Deleting every specialist conversation cascades to its messages, so an
    // empty todoChats map is treated as "not loaded yet" rather than "cleared".
    console.warn(
      `[gtm/state] refused to delete all ${staleConversationIds.length} todo conversations for project ${projectId}: incoming store had none`
    );
  } else if (staleConversationIds.length) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('project_id', projectId)
      .in('id', staleConversationIds);
    fail('Failed to remove stale todo conversations', error);
  }

  await Promise.all(
    (conversations ?? []).map((conversation) =>
      syncMessages(
        conversation.id,
        conversation.kind === 'director'
          ? store.directorChat
          : store.todoChats[conversation.topic_key] ?? []
      )
    )
  );
  } catch (error) {
    if (!project.atomic_state_available) throw error;
    console.error('Failed to update GTM state projections:', error);
  }
  return nextRevision;
}

/**
 * Conversations are append-only, but a background writer holds its snapshot for
 * as long as an agent step runs (minutes for an LLM call) and then commits it
 * wholesale. Anything the browser appended in the meantime — progress cards,
 * user replies, option answers — would silently disappear from the canonical
 * snapshot. Fold those rows back in before committing.
 */
async function withConcurrentChatMessages(
  clerkUserId: string,
  store: GtmStore
): Promise<GtmStore> {
  let latest: GtmStore;
  try {
    const loaded = await loadGtmStore(clerkUserId);
    if (!loaded.hasRemoteData) return store;
    latest = loaded.store;
  } catch {
    // A read failure must not block the write it was only meant to protect.
    return store;
  }

  // The writer's own copy wins for messages it may have just patched; rows it
  // has never seen are additions from the browser and are kept.
  const mergeChat = (
    pending: ChatMessage[],
    concurrent: ChatMessage[]
  ): ChatMessage[] => {
    const byId = new Map(concurrent.map((message) => [message.id, message]));
    for (const message of pending) byId.set(message.id, message);
    return [...byId.values()]
      .sort((left, right) => left.createdAt - right.createdAt)
      .slice(-600);
  };

  const todoChats = { ...latest.todoChats };
  for (const [todoId, messages] of Object.entries(store.todoChats)) {
    todoChats[todoId] = mergeChat(messages, latest.todoChats[todoId] ?? []);
  }

  return {
    ...store,
    directorChat: mergeChat(store.directorChat, latest.directorChat),
    todoChats,
  };
}

/**
 * Server writers (Campaign enqueue / worker) race the browser's debounced
 * PUT /api/gtm/state. Re-read + CAS without an expectedRevision on each try.
 */
export async function saveGtmStoreWithConflictRetry(
  clerkUserId: string,
  store: GtmStore,
  attempts = 5
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await saveGtmStore(
        clerkUserId,
        await withConcurrentChatMessages(clerkUserId, store)
      );
    } catch (error) {
      lastError = error;
      if (!(error instanceof GtmStateConflictError) || attempt === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 40 * 2 ** attempt)
      );
    }
  }
  throw lastError;
}

export function isGtmStore(value: unknown): value is GtmStore {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GtmStore>;
  return (
    candidate.version === GTM_STORE_VERSION &&
    Array.isArray(candidate.directorChat) &&
    Array.isArray(candidate.memoryFacts) &&
    Array.isArray(candidate.pendingAgentRequests) &&
    Array.isArray(candidate.agentActionJobs) &&
    Array.isArray(candidate.artifacts) &&
    Array.isArray(candidate.agentNotifications) &&
    Array.isArray(candidate.channels) &&
    Array.isArray(candidate.topics) &&
    Array.isArray(candidate.topicVariants) &&
    Array.isArray(candidate.todos) &&
    typeof candidate.todoChats === 'object' &&
    typeof candidate.channelStrategies === 'object'
  );
}
