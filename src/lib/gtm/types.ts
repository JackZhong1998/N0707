export type GtmPhase =
  | 'onboarding'
  | 'kickoff'
  | 'confirm'
  | 'strategy'
  | 'calendar'
  | 'execution'
  | 'review';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';

export type SignalType =
  | 'none'
  | 'engagement'
  | 'comment_dm'
  | 'click_lead'
  | 'conversion';

/** 长期记忆：跨对话、跨页面持续积累的产品画像 */
export interface ProductProfile {
  name?: string;
  description?: string;
  valueProp?: string;
  differentiation?: string;
  icp?: string;
  icpPains?: string;
  bestContent?: string;
  avoidPromotion?: string;
  activePlatforms?: string;
  keyFacts: string[];
}

export interface GtmKickoffForm {
  productType?: string;
  targetMarket?: string;
  existingAssets?: string[];
  dailyTimeBudget?: string;
  contentPreference?: string[];
  productUrl?: string;
  thirtyDayGoal?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ChannelRecommendation {
  channelId: string;
  name: string;
  reason: string;
  selected: boolean;
}

export interface CmoChannelRecommendation {
  wave1: ChannelRecommendation[];
  wave2: ChannelRecommendation[];
  phase0: ChannelRecommendation[];
}

export interface WeekTheme {
  week: number;
  theme: string;
  focus: string;
}

export interface StrategySummary {
  thirtyDayGoal: string;
  mainChannels: string[];
  rhythm: string;
  notDoing: string[];
  successSignals: string[];
  weeklyArc?: WeekTheme[];
}

export interface ChannelStrategy {
  channelId: string;
  positioningNote?: string;
  masterPlanMarkdown: string;
  cadence: { postsPerWeek: number; campaignDays: number };
  contentThemes: string[];
  weeklyArc?: WeekTheme[];
  defaultTaskTypes: string[];
  kpis?: string[];
}

export interface Deliverable {
  title: string;
  body: string;
  format: string;
  tips?: string[];
}

export interface DailyTask {
  id: string;
  channelId: string;
  channelName: string;
  dayIndex: number;
  scheduledDate: string;
  scheduledTime?: string;
  taskType: string;
  brief: string;
  angle?: string;
  status: TaskStatus;
  deliverable?: Deliverable;
  strategicNote?: string;
}

export interface UnifiedDayPlan {
  dayIndex: number;
  scheduledDate: string;
  theme?: string;
  tasks: DailyTask[];
}

export interface TaskFeedback {
  taskId: string;
  published: boolean;
  signals: SignalType[];
  conversionNote?: string;
  feelingNote?: string;
  submittedAt: number;
}

export interface WeeklyReview {
  dayIndex: number;
  executionRate: number;
  topSignals: string[];
  contentInsights: string[];
  adjustments: string[];
  summary: string;
  appliedAt?: number;
}

export interface GenerationProgress {
  step: number;
  total: number;
  message: string;
}

export interface GtmState {
  version: number;
  phase: GtmPhase;
  onboardingCompleted: boolean;
  kickoffForm: GtmKickoffForm;
  chatHistory: ChatMessage[];
  /** 长期记忆 */
  productProfile: ProductProfile;
  kickoffSummary?: string;
  channelRecommendation?: CmoChannelRecommendation;
  selectedChannels: string[];
  strategySummary?: StrategySummary;
  channelStrategies: Record<string, ChannelStrategy>;
  unifiedCalendar: UnifiedDayPlan[];
  taskFeedbacks: Record<string, TaskFeedback>;
  weeklyReviews: Record<number, WeeklyReview>;
  /** 全局策略顾问对话历史 */
  strategyChat: ChatMessage[];
  /** 每个任务的内容顾问对话历史 */
  taskChats: Record<string, ChatMessage[]>;
  campaignStartDate?: string;
  currentDayIndex: number;
  generationProgress?: GenerationProgress;
  kickoffRoundCount: number;
  updatedAt: number;
}

export const CAMPAIGN_DURATION_DAYS = 30;
export const FREE_PREVIEW_DAYS = 7;
export const GTM_STATE_VERSION = 2;
export const KICKOFF_MAX_ROUNDS = 7;

export function createInitialGtmState(): GtmState {
  return {
    version: GTM_STATE_VERSION,
    phase: 'onboarding',
    onboardingCompleted: false,
    kickoffForm: {},
    chatHistory: [],
    productProfile: { keyFacts: [] },
    selectedChannels: [],
    channelStrategies: {},
    unifiedCalendar: [],
    taskFeedbacks: {},
    weeklyReviews: {},
    strategyChat: [],
    taskChats: {},
    currentDayIndex: 1,
    kickoffRoundCount: 0,
    updatedAt: Date.now(),
  };
}
