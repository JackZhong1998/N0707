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

export type TodoStatus = 'pending' | 'done' | 'skipped';

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

/* ---------- 消息卡片 ---------- */

export type MessageCard =
  | { kind: 'options'; card: OptionCard }
  | { kind: 'strategy'; title: string; channelIds: string[] }
  | { kind: 'calendar'; title: string }
  | { kind: 'agent-task'; label: string; status: 'running' | 'done' | 'error' };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  card?: MessageCard;
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
}

export interface Todo {
  id: string;
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
  phase?: string;
  status: TodoStatus;
  content?: TodoContent;
  contentStatus: 'none' | 'writing' | 'ready';
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
  directorChat: ChatMessage[];
  strategy?: MarketStrategy;
  channelStrategies: Record<string, ChannelStrategyDoc>;
  /** 已确认的渠道 id 列表 */
  channels: string[];
  todos: Todo[];
  /** 渠道专员对话（以单个 to-do 为上下文，相互独立） */
  todoChats: Record<string, ChatMessage[]>;
  /** 30 天计划起始日 YYYY-MM-DD */
  startDate?: string;
  /** 距离上次档案总结的消息数 */
  msgSinceContextSync: number;
  updatedAt: number;
}

export const GTM_STORE_VERSION = 4;
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
    directorChat: [],
    channelStrategies: {},
    channels: [],
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
  | { type: 'generate_todos'; channelIds: string[] };

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
}

export interface ChannelTodosResponse {
  todos: Array<{
    dayIndex: number;
    title: string;
    brief: string;
    time?: string;
    phase?: string;
  }>;
}

export interface ChannelWriteResponse {
  title: string;
  body: string;
}

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
  }> | null;
}
