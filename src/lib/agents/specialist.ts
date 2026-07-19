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

function text(value: unknown, maxLength: number, fallback = ''): string {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength) || fallback
    : fallback;
}

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
2. **排满 30 天：dayIndex 1 到 30 每天都必须至少有一条 To-Do，不允许出现空天。**
   重内容（发帖/长文）按渠道最佳频率排布，其余的天安排轻量的**发布/新增类**动作
   （发布一条轻量短内容、把已有内容改编成另一种形式发布、新增一条素材/案例、
   引用转发热帖并附上自己的观点等），保证用户每天打开日历都有新东西产出
3. **每条 To-Do 都必须是「发布内容 / 新增内容 / 建设动作」这类主动产出型任务。
   禁止安排「回复评论」「回复私信」「回复讨论」「浏览找选题」「记录数据」这类被动维护任务
   —— 那些是你作为渠道专员日常自动在做的事，不占用用户的行动日历。**
4. 若渠道是官网/落地页类：To-Do 应是一个个具体的建设任务
   （设计 Hero 区、编写某个模块的文案、写 SEO 标题与 meta、建设外链、新增 FAQ/案例页、
   发布 SEO 博客等），而不是抽象的实验类任务（如 A/B test）
5. 所有 To-Do 仅限编写文案、以文本形式做传播（不涉及投放、视频拍摄等）
6. 每条 To-Do 给出 title（动作）和 brief（编写方向，之后你会按 brief 写全文）
7. 每条 To-Do 必须标明 market（该条针对的目标市场，如「中国大陆」「United States」）
   和 audience（针对的目标人群一句话，如「正在做 side project 的独立开发者」）。
   目标市场从策略文档和用户档案推断；之后写正文时语言必须跟随 market
   （英语市场→英文内容，中文市场→中文内容）
8. time 用 HH:mm 表示该渠道最佳发布时间

# 渠道方向性策略文档（必须遵循）
${input.channelStrategyMarkdown}

# 输出格式（严格 JSON）
{"todos": [{"dayIndex": 1, "title": "...", "brief": "...", "time": "09:00", "phase": "第 1 周 · 主题", "market": "中国大陆", "audience": "..."}]}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `${profileBlock(input.userProfileDoc, input.projectProfileDoc)}\n\n请输出 30 天 To-Do 计划。`,
    },
  ];

  const out = await callOpenRouterJson<ChannelTodosResponse>(messages, {
    temperature: 0.55,
    maxTokens: 8192,
  });
  out.todos = (Array.isArray(out.todos) ? out.todos : []).flatMap((todo) => {
    if (!todo || typeof todo !== 'object') return [];
    const dayIndex =
      typeof todo.dayIndex === 'number' && Number.isFinite(todo.dayIndex)
        ? Math.trunc(todo.dayIndex)
        : 0;
    const title = text(todo.title, 500);
    const brief = text(todo.brief, 2_000);
    if (dayIndex < 1 || dayIndex > 30 || !title || !brief) return [];
    const time = text(todo.time, 10);
    return [
      {
        dayIndex,
        title,
        brief,
        time: /^\d{2}:\d{2}$/.test(time) ? time : undefined,
        phase: text(todo.phase, 300) || undefined,
        market: text(todo.market, 300) || undefined,
        audience: text(todo.audience, 500) || undefined,
      },
    ];
  });

  // “30 天计划”必须真的覆盖每天。模型漏天时只补漏掉的日期，
  // 不丢弃已经生成的高质量任务。
  const coveredDays = new Set(out.todos.map((todo) => todo.dayIndex));
  if (coveredDays.size < 30) {
    const fallback = await mockChannelTodos({ channelId: input.channelId });
    out.todos.push(
      ...fallback.todos.filter((todo) => !coveredDays.has(todo.dayIndex))
    );
  }
  out.todos = out.todos
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .slice(0, 45);
  return out;
}

/* ------------------------------------------------------------------ */
/* 任务二：one-shot 撰写单条内容                                        */
/* ------------------------------------------------------------------ */

export interface ChannelWriteInput {
  todo: Pick<Todo, 'channelId' | 'title' | 'brief' | 'dayIndex' | 'phase' | 'market' | 'audience'>;
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
6. **发布语言跟随目标市场**：面向英语市场（如 United States）→ 全文英文；
   面向中文市场（如中国大陆）→ 全文中文

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
- 目标市场：${input.todo.market ?? '（未标注，按用户档案判断）'}
- 目标人群：${input.todo.audience ?? '（未标注，按渠道策略判断）'}

请撰写发布内容。`,
    },
  ];

  const output = await callOpenRouterJson<ChannelWriteResponse>(messages, {
    temperature: 0.8,
    maxTokens: 4096,
  });
  const title = text(output.title, 1_000);
  const body = text(output.body, 60_000);
  if (!title || !body) {
    return mockChannelWrite({
      title: input.todo.title,
      brief: input.todo.brief,
      channelId: input.todo.channelId,
    });
  }
  return { title, body };
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
      channelId: input.todo.channelId,
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
  "rewrite_plan": [{"dayIndex":1,"title":"...","brief":"...","time":"09:00","phase":"...","market":"中国大陆","audience":"..."}] 或 null
}
注意：rewrite_plan 必须排满 30 天（每天至少一条），每条带 market 与 audience；
所有 To-Do 必须是发布内容 / 新增内容 / 建设动作，禁止「回复评论 / 回复私信 / 回复讨论」类被动维护任务
（那是渠道专员日常自动处理的）。官网/落地页渠道的 To-Do 应是具体建设任务（设计 Hero、写模块文案、SEO、外链等）。`;

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

  const rewriteTitle = text(out.rewrite_content?.title, 1_000);
  const rewriteBody = text(out.rewrite_content?.body, 60_000);
  const rewritePlan = (Array.isArray(out.rewrite_plan)
    ? out.rewrite_plan
    : []
  ).flatMap((todo) => {
    if (!todo || typeof todo !== 'object') return [];
    const dayIndex =
      typeof todo.dayIndex === 'number' && Number.isFinite(todo.dayIndex)
        ? Math.trunc(todo.dayIndex)
        : 0;
    const title = text(todo.title, 500);
    const brief = text(todo.brief, 2_000);
    if (dayIndex < 1 || dayIndex > 30 || !title || !brief) return [];
    const time = text(todo.time, 10);
    return [
      {
        dayIndex,
        title,
        brief,
        time: /^\d{2}:\d{2}$/.test(time) ? time : undefined,
        phase: text(todo.phase, 300) || undefined,
        market: text(
          (todo as typeof todo & { market?: unknown }).market,
          300
        ) || undefined,
        audience: text(
          (todo as typeof todo & { audience?: unknown }).audience,
          500
        ) || undefined,
      },
    ];
  });

  return {
    reply: text(out.reply, 12_000, '收到，你具体想怎么调整？'),
    rewriteContent:
      rewriteTitle && rewriteBody
        ? { title: rewriteTitle, body: rewriteBody }
        : null,
    rewritePlan: rewritePlan.length > 0 ? rewritePlan : null,
  };
}
