/**
 * 渠道专员 Agent（Channel Specialist）
 *
 * 每个已确认渠道对应一位专员。渠道 Skill 全文作为 System Prompt 变量直接嵌入
 * （全程佩戴，不走工具召回）；渠道方向性策略文档同样作为变量注入。
 *
 * 三个任务：
 * 1. 依据渠道策略编写该渠道 30 天 GTM To-Do（每天做什么，仅限文案/文本传播）
 * 2. 单次调用为一条 To-Do 撰写内容（one-shot，以用户口吻、写出"有人味"的内容）
 * 3. 在 To-Do 详情页与用户对话修改——两套工具：
 *    a) rewrite_content 重写当前 to-do 的内容
 *    b) rewrite_plan 重写该渠道整个 30 天 To-Do 方向
 */

import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import type {
  ChannelChatResponse,
  ChannelTodosResponse,
  ChannelWriteResponse,
  ChatMessage,
  Todo,
} from '@/lib/gtm/types';
import { channelName, getChannelSkillForPrompt } from './catalog';
import {
  isMockMode,
  mockChannelChat,
  mockChannelTodos,
  mockChannelWrite,
} from './mock';

function specialistIdentity(channelId: string, locale: string): string {
  const isZh = locale !== 'en';
  return `你是 NowBuild 的「${channelName(channelId)} 渠道专员」，一位深耕该渠道的 Go-to-Market 执行专家。你服务的用户是一人公司创始人 / 独立开发者。${isZh ? '始终用中文输出。' : 'Always output in English.'}

# 你全程佩戴的渠道 Skill（你的方法论，必须遵循）
${getChannelSkillForPrompt(channelId) || '（skill 缺失，凭该渠道最佳实践执行）'}`;
}

function profileBlock(userProfileDoc: string, projectProfileDoc: string): string {
  return `# 用户个人档案
${userProfileDoc || '（暂无）'}

# 项目档案
${projectProfileDoc || '（暂无）'}`;
}

/* ------------------------------------------------------------------ */
/* 任务一：编写 30 天 To-Do                                             */
/* ------------------------------------------------------------------ */

export interface ChannelTodosInput {
  channelId: string;
  channelStrategyMarkdown: string;
  userProfileDoc: string;
  projectProfileDoc: string;
  locale: string;
}

export async function runChannelTodos(
  input: ChannelTodosInput
): Promise<ChannelTodosResponse> {
  if (isMockMode()) {
    return mockChannelTodos({ channelId: input.channelId });
  }

  const system = `${specialistIdentity(input.channelId, input.locale)}

# 本次任务
依据下方渠道方向性策略文档，编写未来 30 天（dayIndex 1-30）的 GTM To-Do 计划：
1. 明确每个阶段（周）做什么、每天具体做什么
2. 所有 To-Do 仅限编写文案、以文本形式做传播（不涉及投放、视频拍摄等）
3. 每条 To-Do 给出 title（动作）和 brief（编写方向，之后你会按 brief 写全文）
4. 节奏合理：不必每天都有，按渠道最佳频率排布（一般每周 3-5 条）
5. time 用 HH:mm 表示该渠道最佳发布时间

# 渠道方向性策略文档（策略生成 Agent 给定的方向，必须遵循）
${input.channelStrategyMarkdown}

# 输出格式（严格 JSON）
{"todos": [{"dayIndex": 1, "title": "...", "brief": "...", "time": "09:00", "phase": "第 1 周 · 主题"}]}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `${profileBlock(input.userProfileDoc, input.projectProfileDoc)}\n\n请输出 30 天 To-Do 计划。`,
    },
  ];

  const out = await callOpenRouterJson<ChannelTodosResponse>(messages, {
    temperature: 0.55,
    maxTokens: 6144,
  });
  out.todos = (out.todos ?? [])
    .filter((t) => t.dayIndex >= 1 && t.dayIndex <= 30 && t.title)
    .slice(0, 40);
  if (out.todos.length === 0) {
    return mockChannelTodos({ channelId: input.channelId });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 任务二：one-shot 撰写单条内容                                        */
/* ------------------------------------------------------------------ */

export interface ChannelWriteInput {
  todo: Pick<Todo, 'channelId' | 'title' | 'brief' | 'dayIndex' | 'phase'>;
  channelStrategyMarkdown: string;
  userProfileDoc: string;
  projectProfileDoc: string;
  locale: string;
}

export async function runChannelWrite(
  input: ChannelWriteInput
): Promise<ChannelWriteResponse> {
  if (isMockMode()) {
    return mockChannelWrite({
      title: input.todo.title,
      brief: input.todo.brief,
      channelId: input.todo.channelId,
    });
  }

  const system = `${specialistIdentity(input.todo.channelId, input.locale)}

# 本次任务（one-shot）
为下面这条 To-Do 撰写完整的发布内容。核心要求：
1. **以用户本人的口吻写**：从档案里的真人定位和表达方式出发，写出"有人味"的内容
2. 禁止 AI 腔：不用"在这个快节奏的时代"之类的套话，不堆形容词，不写"首先/其次/最后"式八股
3. 具体、真实、有细节：真实经历 > 抽象道理；具体数字 > 模糊描述
4. 符合该渠道的格式习惯（标题长度、正文结构、话题标签等按渠道 Skill 来）
5. 直接可发布：用户复制粘贴即可发出

# 渠道方向性策略文档
${input.channelStrategyMarkdown.slice(0, 4000)}

# 输出格式（严格 JSON）
{"title": "发布标题", "body": "完整正文（含换行）"}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `${profileBlock(input.userProfileDoc, input.projectProfileDoc)}

# 要写的 To-Do
- 第 ${input.todo.dayIndex} 天${input.todo.phase ? `（${input.todo.phase}）` : ''}
- 动作：${input.todo.title}
- 编写方向：${input.todo.brief}

请撰写发布内容。`,
    },
  ];

  return callOpenRouterJson<ChannelWriteResponse>(messages, {
    temperature: 0.8,
    maxTokens: 4096,
  });
}

/* ------------------------------------------------------------------ */
/* 任务三：详情页对话修改（两套工具）                                    */
/* ------------------------------------------------------------------ */

export interface ChannelChatInput {
  todo: Pick<Todo, 'id' | 'channelId' | 'title' | 'brief' | 'dayIndex' | 'phase'>;
  currentContent?: { title: string; body: string };
  history: ChatMessage[];
  message: string;
  channelStrategyMarkdown: string;
  /** 该渠道全部 to-do 摘要，供 rewrite_plan 参考 */
  channelTodosDigest: string;
  userProfileDoc: string;
  projectProfileDoc: string;
  locale: string;
}

interface ChannelChatLlmOutput {
  reply?: string;
  rewrite_content?: { title: string; body: string } | null;
  rewrite_plan?: Array<{
    dayIndex: number;
    title: string;
    brief: string;
    time?: string;
    phase?: string;
  }> | null;
}

export async function runChannelChat(
  input: ChannelChatInput
): Promise<ChannelChatResponse> {
  if (isMockMode()) {
    return mockChannelChat({
      message: input.message,
      todoTitle: input.todo.title,
      currentBody: input.currentContent?.body,
    });
  }

  const system = `${specialistIdentity(input.todo.channelId, input.locale)}

# 场景
你正在 To-Do 详情页与用户对话。对话上下文仅限当前这一条 To-Do。用户可能：
1. 对已写好的内容提意见 → 用 rewrite_content 工具重写当前内容（保持用户口吻、有人味）
2. 想调整该渠道整个 30 天的 To-Do 方向 → 用 rewrite_plan 工具重排整个渠道 30 天计划
3. 只是咨询 → 直接文字回复，不用工具

# 当前 To-Do
- 第 ${input.todo.dayIndex} 天${input.todo.phase ? `（${input.todo.phase}）` : ''}：${input.todo.title}
- 编写方向：${input.todo.brief}

# 当前已写好的内容
${input.currentContent ? `标题：${input.currentContent.title}\n正文：\n${input.currentContent.body}` : '（尚未撰写）'}

# 渠道方向性策略文档
${input.channelStrategyMarkdown.slice(0, 3000)}

# 该渠道现有 30 天 To-Do 一览（rewrite_plan 时参考）
${input.channelTodosDigest}

# 输出格式（严格 JSON）
{
  "reply": "给用户的话",
  "rewrite_content": {"title":"...","body":"..."} 或 null,
  "rewrite_plan": [{"dayIndex":1,"title":"...","brief":"...","time":"09:00","phase":"..."}] 或 null
}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: profileBlock(input.userProfileDoc, input.projectProfileDoc),
    },
    ...input.history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: input.message },
  ];

  const out = await callOpenRouterJson<ChannelChatLlmOutput>(messages, {
    temperature: 0.7,
    maxTokens: 4096,
  });

  return {
    reply: out.reply ?? '收到，你具体想怎么调整？',
    rewriteContent: out.rewrite_content ?? null,
    rewritePlan:
      out.rewrite_plan?.filter((t) => t.dayIndex >= 1 && t.dayIndex <= 30) ?? null,
  };
}
