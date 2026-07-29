/**
 * NowBuild GTM Agent 系统 — 核心类型
 *
 * 三个协同 Agent：
 * 1. 市场总监（Director）— 对话主入口，通过工具调用驱动其他 Agent
 * 2. 策略生成（Strategist）— 输出市场策略 + 各渠道方向性文档
 * 3. 上下文管理（Context）— 累积用户个人档案 / 项目档案
 * 4. 渠道专员（Channel Specialist）— 生成 30 天 To-Do、单条内容撰写、对话修改
 */

export type ChatRole = 'user' | 'assistant';

export interface MessageContextRef {
  view: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  title?: string;
  channelId?: string;
  section?: string;
  selectedText?: string;
  revision?: string | number;
}

export type MemoryCategory =
  | 'identity'
  | 'preference'
  | 'product'
  | 'decision'
  | 'learning';

export interface MemoryFact {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  confirmed: boolean;
  sourceMessageIds: string[];
  updatedAt: number;
}

export interface PendingAgentRequest {
  id: string;
  messageId: string;
  text: string;
  context?: MessageContextRef;
  meta?: {
    fromOptionCard?: boolean;
    selectedIds?: string[];
  };
  createdAt: number;
}

export interface AgentActionJob {
  id: string;
  actions: DirectorAction[];
  sourceMessageIds: string[];
  status: 'queued' | 'running';
  createdAt: number;
  updatedAt: number;
}

export type AgentArtifactKind =
  | 'research_report'
  | 'weekly_review'
  | 'strategy_proposal'
  | 'topic_plan'
  | 'general';

export type AgentArtifactStatus =
  | 'draft'
  | 'waiting_approval'
  | 'applied'
  | 'archived';

export interface AgentArtifact {
  id: string;
  kind: AgentArtifactKind;
  title: string;
  summary: string;
  markdown: string;
  status: AgentArtifactStatus;
  version: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface AgentNotification {
  id: string;
  title: string;
  summary: string;
  artifactId?: string;
  priority: 'normal' | 'important' | 'blocking';
  read: boolean;
  createdAt: number;
}

export type TodoStatus = 'pending' | 'done' | 'skipped';

export type PublishStatus =
  | 'not_started'
  | 'opening'
  | 'filling'
  | 'needs_user_action'
  | 'awaiting_user'
  | 'waiting_login'
  | 'publishing'
  | 'published_needs_link'
  | 'published'
  | 'tracked'
  | 'blocked'
  | 'failed';

export type TrackingStatus =
  | 'not_started'
  | 'active'
  | 'collecting'
  | 'needs_user'
  | 'failed'
  | 'completed';

/* ---------- 选题库 ---------- */

/** 核心选题从哪里产生。保留 custom 以兼容用户自定义来源。 */
export type TopicSource =
  | 'strategy'
  | 'user'
  | 'research'
  | 'performance'
  | 'agent'
  | 'custom';

export type TopicPriority = 'high' | 'medium' | 'low';

export type TopicStatus =
  | 'idea'
  | 'shortlisted'
  | 'scheduled'
  | 'published'
  | 'archived';

export type TopicVariantStatus =
  | 'draft'
  | 'selected'
  | 'scheduled'
  | 'published'
  | 'rejected';

/**
 * 与渠道无关的核心选题。它负责保存「为什么要写」，渠道表达放在
 * TopicVariant 中，一个核心选题可派生多个渠道版本。
 */
export interface Topic {
  id: string;
  title: string;
  source: TopicSource;
  /** 当 source=custom 时保存用户填写的来源，也可作为来源补充说明。 */
  sourceLabel?: string;
  targetAudience: string;
  painPoint: string;
  corePoint: string;
  priority: TopicPriority;
  status: TopicStatus;
  createdAt: number;
  updatedAt: number;
}

/** 核心选题在某个渠道上的具体表达方案。 */
export interface TopicVariant {
  id: string;
  topicId: string;
  channelId: string;
  channelName: string;
  hook: string;
  angle: string;
  format: string;
  cta: string;
  status: TopicVariantStatus;
  createdAt: number;
  updatedAt: number;
}

export interface PostMetrics {
  impressions?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  followersGained?: number;
}

export interface PostMetricSnapshot {
  id: string;
  collectedAt: number;
  source: 'extension' | 'manual';
  metrics: PostMetrics;
}

/* ---------- 选项卡片（市场总监的问卷式提问） ---------- */

export interface OptionItem {
  id: string;
  label: string;
  description?: string;
}

export interface OptionCard {
  question: string;
  multi: boolean;
  options: OptionItem[];
  allowCustom?: boolean;
  /** 用户提交后记录所选 label */
  answered?: string[];
}

/* ---------- 冷启动问卷卡片（进入对话立即展示的固定多题卡） ---------- */

export interface KickoffQuestion {
  id: string;
  question: string;
  multi: boolean;
  options: OptionItem[];
}

export interface KickoffCard {
  title: string;
  questions: KickoffQuestion[];
  /** 用户提交后记录：questionId -> 所选 label 列表 */
  answered?: Record<string, string[]>;
  /** 已上线产品用户提交的产品链接 */
  productUrl?: string;
}

/* ---------- 消息卡片 ---------- */

export type MessageCard =
  | { kind: 'options'; card: OptionCard }
  | { kind: 'kickoff'; card: KickoffCard }
  | { kind: 'strategy'; title: string; channelIds: string[] }
  | { kind: 'calendar'; title: string }
  | {
      kind: 'artifact';
      artifactId: string;
      title: string;
      summary: string;
      status: AgentArtifactStatus;
    }
  | { kind: 'agent-task'; label: string; status: 'running' | 'done' | 'error' };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  card?: MessageCard;
  contextRef?: MessageContextRef;
  /** Foreground reply attribution when later user bubbles already exist. */
  replyToMessageIds?: string[];
  lane?: 'foreground' | 'background' | 'proactive';
  agentJobId?: string;
}

/* ---------- 策略文档 ---------- */

export interface MarketStrategy {
  /** 总体市场策略（30 天冷启动计划总览） */
  overviewMarkdown: string;
  goal: string;
  updatedAt: number;
}

/**
 * 渠道方向性文档：
 * - 显示在市场策略页面
 * - 作为变量注入对应渠道专员的 System Prompt
 */
export interface ChannelStrategyDoc {
  channelId: string;
  channelName: string;
  positioning: string;
  direction: string;
  contentPillars: string[];
  markdown: string;
  updatedAt: number;
}

/* ---------- To-Do ---------- */

export interface TodoContent {
  title: string;
  body: string;
  research?: {
    status: 'grounded' | 'no_results' | 'unavailable';
    searchedAt: number;
    sources: Array<{
      title: string;
      url: string;
      publishedAt?: string;
    }>;
  };
}

export interface TodoContentVersion {
  id: string;
  version: number;
  content: TodoContent;
  createdAt: number;
  reason?: string;
}

export interface Todo {
  id: string;
  /** 可选：该执行任务所采用的渠道选题版本。 */
  topicVariantId?: string;
  channelId: string;
  channelName: string;
  /** 1-30 */
  dayIndex: number;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm，可选 */
  time?: string;
  title: string;
  /** 编写方向（渠道专员写内容时的 brief） */
  brief: string;
  /** Why this task exists in the shared campaign spine. */
  purpose?: string;
  /** Campaign content pillar shared by every channel. */
  pillar?: string;
  /** Channel-specific execution type (post, article, submission, etc.). */
  taskType?: string;
  phase?: string;
  /** 该 To-Do 针对的目标市场（如「中国大陆」「United States」）；决定产出内容的语言 */
  market?: string;
  /** 该 To-Do 针对的目标人群一句话 */
  audience?: string;
  status: TodoStatus;
  /** Rich execution state used by the Launch Calendar. */
  launchStatus?: LaunchTaskStatus;
  revision?: number;
  content?: TodoContent;
  contentStatus: 'none' | 'writing' | 'ready';
  /** Current copy revision plus the restorable versions it replaced. */
  contentRevision?: number;
  contentHistory?: TodoContentVersion[];
  /** 浏览器插件发布状态。旧数据没有该字段时视为 not_started。 */
  publishStatus?: PublishStatus;
  /** 平台返回的最终帖子地址。 */
  publishedUrl?: string;
  /** Publishing can finish before a trustworthy public post URL is available. */
  linkStatus?: 'pending' | 'confirmed';
  publishedAt?: number;
  publishError?: string;
  trackingStatus?: TrackingStatus;
  metricSnapshots?: PostMetricSnapshot[];
}

/* ---------- 30-day Launch OS ---------- */

export type LaunchPhase =
  | 'onboarding'
  | 'researching'
  | 'brief_ready'
  | 'blueprint_ready'
  | 'building_team'
  | 'active'
  | 'completed';

/** Free-tier AI write-backs allowed against Launch Brief before checkout. */
export const FREE_BRIEF_EDIT_LIMIT = 20;

export type LaunchTaskStatus =
  | 'planned'
  | 'generating'
  | 'draft'
  | 'ready'
  | 'needs_action'
  | 'publishing'
  | 'published'
  | 'completed'
  | 'skipped'
  | 'failed'
  | 'replanning';

export type EvidenceConfidence = 'website' | 'inferred' | 'confirmed';

export interface LaunchEvidence {
  label: string;
  confidence: EvidenceConfidence;
  sourceUrl?: string;
}

export interface LaunchProject {
  id: string;
  productUrl: string;
  productName: string;
  startDate: string;
  endDate: string;
  currentDay: number;
  phase: LaunchPhase;
  status: 'building' | 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface ResearchProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'warning';
  detail?: string;
}

export interface LaunchBrief {
  product: {
    summary: string;
    problem: string;
    features: string[];
    stage: string;
    pricing: string;
  };
  audience: {
    primary: string;
    currentAlternative: string;
    scenarios: string[];
    motivations: string[];
  };
  competitors: Array<{
    name: string;
    url?: string;
    positioning: string;
    difference: string;
  }>;
  positioning: {
    statement: string;
    sellingPoints: string[];
    painPoints: string[];
    voice: string;
    nonGoals: string[];
  };
  evidence: LaunchEvidence[];
  sourceMarkdown?: string;
  revision: number;
  updatedAt: number;
}

export interface LaunchBlueprint {
  campaignGoal: string;
  corePositioning: string;
  targetAudience: string;
  campaignPillars: string[];
  weeks: Array<{
    week: number;
    objective: string;
    narrative: string;
    productIntensity: 'low' | 'low-medium' | 'medium' | 'high';
  }>;
  channelRoles: Array<{
    channelId: string;
    channelName: string;
    role: string;
    priority: 'high' | 'medium' | 'supporting';
  }>;
  guardrails: string[];
  language: string;
  sourceMarkdown?: string;
  revision: number;
  updatedAt: number;
}

export interface LaunchChannelPlan {
  channelId: string;
  channelName: string;
  mission: string;
  whyItMatters: string;
  targetAudience: string;
  pillars: string[];
  formats: string[];
  cadence: string;
  productMentionRules: string;
  weeklyPlan: string[];
  successSignals: string[];
  risks: string[];
  status: 'queued' | 'building' | 'ready' | 'blocked';
  completedTasks: number;
  revision: number;
  updatedAt: number;
}

export type DirectorySubmissionStatus =
  | 'discovered'
  | 'matched'
  | 'prepared'
  | 'needs_action'
  | 'submitted'
  | 'under_review'
  | 'published'
  | 'rejected'
  | 'unavailable';

export type DirectoryMaterialKey =
  | 'productName'
  | 'productUrl'
  | 'tagline'
  | 'shortDescription'
  | 'longDescription'
  | 'categories'
  | 'tags'
  | 'pricing'
  | 'founderName'
  | 'founderEmail'
  | 'founderUrl'
  | 'twitterUrl'
  | 'linkedinUrl'
  | 'demoUrl'
  | 'launchDate'
  | 'logo'
  | 'screenshots';

export interface DirectoryAssetSpec {
  width: number;
  height: number;
  type: 'image/png' | 'image/jpeg' | 'image/webp';
  maxBytes?: number;
  maxCount?: number;
  quality?: number;
}

export interface DirectoryMaterialRequirement {
  key: DirectoryMaterialKey;
  resolution: 'ai' | 'user';
  required: boolean;
  minLength?: number;
  detail?: string;
  assetSpec?: DirectoryAssetSpec;
}

export interface DirectoryMaterialCheck {
  key: DirectoryMaterialKey;
  label: string;
  status: 'ready' | 'ai_generatable' | 'needs_user';
  detail?: string;
}

export interface DirectoryPreflightResult {
  checkedAt: number;
  ready: boolean;
  checks: DirectoryMaterialCheck[];
  readyCount: number;
  aiCount: number;
  userCount: number;
}

export type DirectorySubmissionJobStatus =
  | 'checking'
  | 'needs_materials'
  | 'queued'
  | 'opening'
  | 'filling'
  | 'needs_action'
  | 'prepared'
  | 'submitted'
  | 'under_review'
  | 'published'
  | 'manual'
  | 'failed'
  | 'skipped';

export interface DirectorySubmissionJob {
  id: string;
  directoryId: string;
  directoryName: string;
  adapterId?: string;
  submissionPolicy?: 'prepare_only' | 'auto_submit_opt_in';
  allowFinalSubmit?: boolean;
  idempotencyKey: string;
  status: DirectorySubmissionJobStatus;
  preflight: DirectoryPreflightResult;
  requestId?: string;
  blocker?: string;
  blockerDetail?: string;
  missingRequired?: string[];
  proof?: string;
  attempt: number;
  createdAt: number;
  updatedAt: number;
}

export interface DirectorySubmission {
  id: string;
  name: string;
  url: string;
  matchReason: string;
  pricing: 'free' | 'paid' | 'freemium' | 'unknown';
  requiredAssets: string[];
  automationLevel: 'automatic' | 'assisted' | 'manual';
  lastVerified: string;
  status: DirectorySubmissionStatus;
  fitScore?: number;
  fitTier?: 'recommended' | 'verify' | 'not_suitable';
  fitReasons?: string[];
  fitRisks?: string[];
  proof?: string;
  publishedUrl?: string;
}

export interface DirectoryLaunchKit {
  productName: string;
  productUrl: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  categories: string[];
  tags: string[];
  pricing: string;
  founderName: string;
  founderEmail: string;
  founderUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  demoUrl: string;
  launchDate: string;
  assets: Array<{
    id: string;
    kind: 'logo' | 'screenshot';
    name: string;
    dataUrl: string;
    sourceUrl?: string;
    source?: 'manual' | 'metadata' | 'homepage_capture';
  }>;
  confirmedAt?: number;
}

export interface LaunchWeeklyReview {
  id: string;
  week: number;
  status: 'upcoming' | 'ready' | 'applied';
  summary: string;
  channelFindings: Array<{
    channelId: string;
    did: string;
    signal: string;
    keep: string;
    change: string;
  }>;
  appliedChanges: string[];
  revision: number;
  createdAt?: number;
}

export interface LaunchRevision {
  id: string;
  entityType: 'brief' | 'blueprint' | 'channel_plan' | 'calendar';
  entityId: string;
  label: string;
  revision: number;
  snapshot: unknown;
  createdAt: number;
}

export interface LaunchState {
  project: LaunchProject;
  researchProgress: ResearchProgressStep[];
  researchConfidence: 'high' | 'medium' | 'low';
  researchSources: Array<{ url: string; title: string; kind: string }>;
  brief?: LaunchBrief;
  blueprint?: LaunchBlueprint;
  channelPlans: Record<string, LaunchChannelPlan>;
  directories: DirectorySubmission[];
  directoryLaunchKit?: DirectoryLaunchKit;
  /** Durable, resumable work queue for directory preparation and submission. */
  directoryJobs?: DirectorySubmissionJob[];
  weeklyReviews: LaunchWeeklyReview[];
  revisions: LaunchRevision[];
  lastUndoLabel?: string;
  /** Successful free-tier Launch Brief AI write-backs (max FREE_BRIEF_EDIT_LIMIT). */
  briefEditUsed?: number;
  /** Idempotency key so post-payment campaign generation is not restarted twice. */
  campaignBuildId?: string;
}

/* ---------- 全局 Store ---------- */

export interface GtmStore {
  version: number;
  /** 支付墙已解锁 */
  paid: boolean;
  /** 策略与 To-Do 已生成，真实日历解锁 */
  planReady: boolean;
  /** 用户个人档案（上下文 Agent 维护，markdown） */
  userProfileDoc: string;
  /** 项目档案（上下文 Agent 维护，markdown） */
  projectProfileDoc: string;
  /** 近期话题与未完成承诺的滚动摘要，用于压缩无限对话。 */
  conversationSummary: string;
  /** 可检索、可修订的长期事实与偏好。 */
  memoryFacts: MemoryFact[];
  directorChat: ChatMessage[];
  /** 已显示但尚未由主 Agent 处理的用户消息，刷新后可恢复。 */
  pendingAgentRequests: PendingAgentRequest[];
  /** 主 Agent 已决策、等待 Worker 执行的动作；与前台对话解耦并可恢复。 */
  agentActionJobs: AgentActionJob[];
  /** 长报告和大范围修改方案放在左侧工作区。 */
  artifacts: AgentArtifact[];
  /** 主动任务完成后先进入通知箱，不抢占当前对话。 */
  agentNotifications: AgentNotification[];
  lastReflectionAt?: number;
  strategy?: MarketStrategy;
  channelStrategies: Record<string, ChannelStrategyDoc>;
  /** 已确认的渠道 id 列表 */
  channels: string[];
  /** 渠道无关的核心选题库。 */
  topics: Topic[];
  /** 每个核心选题面向不同渠道的表达版本。 */
  topicVariants: TopicVariant[];
  todos: Todo[];
  /** 渠道专员对话（以单个 to-do 为上下文，相互独立） */
  todoChats: Record<string, ChatMessage[]>;
  /** 30 天计划起始日 YYYY-MM-DD */
  startDate?: string;
  /** 距离上次档案总结的消息数 */
  msgSinceContextSync: number;
  updatedAt: number;
  /** Structured state for the post-purchase 30-day cold-start product. */
  launch?: LaunchState;
}

export const GTM_STORE_VERSION = 6;
export const CAMPAIGN_DAYS = 30;
/** 每积累 6 条消息触发一次上下文总结 */
export const CONTEXT_SYNC_INTERVAL = 6;

export function createInitialStore(): GtmStore {
  return {
    version: GTM_STORE_VERSION,
    paid: false,
    planReady: false,
    userProfileDoc: '',
    projectProfileDoc: '',
    conversationSummary: '',
    memoryFacts: [],
    directorChat: [],
    pendingAgentRequests: [],
    agentActionJobs: [],
    artifacts: [],
    agentNotifications: [],
    channelStrategies: {},
    channels: [],
    topics: [],
    topicVariants: [],
    todos: [],
    todoChats: {},
    msgSinceContextSync: 0,
    updatedAt: Date.now(),
  };
}

/* ---------- Agent API 载荷 ---------- */

/** 市场总监向前端返回的动作指令（前端负责发起后台任务） */
export type DirectorAction =
  | { type: 'generate_strategy'; channelIds: string[]; feedback?: string }
  | { type: 'generate_todos'; channelIds: string[] }
  | { type: 'generate_topics'; channelIds: string[]; count?: number }
  | { type: 'research_product'; websiteUrl: string }
  | { type: 'generate_weekly_review'; silent?: boolean }
  | {
      type: 'schedule_topic_variant';
      topicVariantId: string;
      date: string;
      time?: string;
    }
  | {
      type: 'revise_topic_variant';
      topicVariantId: string;
      hook?: string;
      angle?: string;
      format?: string;
      cta?: string;
    }
  | { type: 'generate_todo_content'; todoId: string }
  | { type: 'rewrite_todo_content'; todoId: string; feedback: string }
  | { type: 'optimize_plan'; channelIds: string[]; feedback: string }
  | {
      type: 'update_launch_artifact';
      entityType: 'brief' | 'blueprint' | 'channel_plan' | 'calendar';
      entityId?: string;
      instruction: string;
    }
  | { type: 'undo_launch_change' };

export interface DirectorResponse {
  reply: string;
  optionCard?: OptionCard | null;
  actions?: DirectorAction[];
}

export interface StrategyResponse {
  overviewMarkdown: string;
  goal: string;
  channels: Array<{
    channelId: string;
    channelName: string;
    positioning: string;
    direction: string;
    contentPillars: string[];
    markdown: string;
  }>;
}

export interface ContextResponse {
  userProfileDoc: string;
  projectProfileDoc: string;
  conversationSummary: string;
  memoryFacts: MemoryFact[];
}

export interface ChannelTodosResponse {
  todos: Array<{
    dayIndex: number;
    title: string;
    brief: string;
    time?: string;
    phase?: string;
    market?: string;
    audience?: string;
    purpose?: string;
    pillar?: string;
    taskType?: string;
    launchStatus?: Extract<
      LaunchTaskStatus,
      'planned' | 'draft' | 'ready' | 'needs_action'
    >;
  }>;
}

export interface ChannelWriteResponse extends TodoContent {}

export interface ChannelChatResponse {
  reply: string;
  /** 工具一：重写当前 to-do 的内容 */
  rewriteContent?: TodoContent | null;
  /** 工具二：重写该渠道整个 30 天 to-do 计划 */
  rewritePlan?: Array<{
    dayIndex: number;
    title: string;
    brief: string;
    time?: string;
    phase?: string;
    market?: string;
    audience?: string;
    purpose?: string;
    pillar?: string;
    taskType?: string;
    launchStatus?: Extract<
      LaunchTaskStatus,
      'planned' | 'draft' | 'ready' | 'needs_action'
    >;
  }> | null;
}
