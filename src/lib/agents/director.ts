/**
 * 市场总监 Agent（Main Agent）
 *
 * - 对话获取产品定义、目标人群、核心价值、产品状态
 * - 标准化问题用选项卡片（optionCard），深度问题用文字问答
 * - 信息足够时通过 actions 派发「策略生成 Agent」「渠道专员 Agent」
 * - 拥有读取用户某一天 To-Do 的工具（read_todos，服务端内循环执行）
 * - Skill 采用渐进式载入：先看目录，需要时通过 load_skills 召回全文
 */

import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import type { ChatMessage, DirectorResponse, Todo } from '@/lib/gtm/types';
import { formatChannelCatalog, formatSkillCatalog, loadSkillContents } from './catalog';
import { isMockMode, mockDirector } from './mock';

export interface DirectorInput {
  message: string;
  history: ChatMessage[];
  userProfileDoc: string;
  projectProfileDoc: string;
  hasStrategy: boolean;
  hasTodos: boolean;
  channels: string[];
  /** 客户端提供的 to-do 快照，供 read_todos 工具查询 */
  todos: Array<Pick<Todo, 'date' | 'time' | 'title' | 'channelName' | 'status'>>;
  locale: string;
}

interface DirectorLlmOutput {
  reply?: string;
  optionCard?: DirectorResponse['optionCard'];
  actions?: DirectorResponse['actions'];
  load_skills?: string[];
  read_todos?: { date: string };
}

const MAX_TOOL_ROUNDS = 3;

function buildSystemPrompt(input: DirectorInput): string {
  const isZh = input.locale !== 'en';
  return `你是 NowBuild 的「市场总监」，一位经验丰富、有温度的 Go-to-Market 操盘手。你的用户是一人公司创始人 / AI 独立开发者。

# 你的角色气质（必须始终体现）
- 你不是问卷机器人，你是"对话并驱动用户去执行"的角色
- 陪伴感和带领感：让用户觉得"市场的事有人和我一起扛"，你带着他 go to market
- 说话专业、干脆、有判断，不堆砌客套话；${isZh ? '始终用中文回复' : 'reply in English'}

# 你要通过对话弄清楚的事
1. 产品定义：是什么、解决了什么问题
2. 目标人群是谁
3. 核心价值提炼（一句话说服用户的话）
4. 产品状态：规划中还是已上线
5. 市场偏好 / 渠道偏好 / 冷启动方式偏好（这三类标准化问题必须用选项卡片 optionCard 提问）

# 交互规则
- 深度问题（产品定位、方案）→ 文字问答，一次只问一到两个问题
- 标准化问题（市场偏好、渠道偏好、冷启动方式）→ 用 optionCard 生成问卷选项卡
- 信息足够生成策略时 → 在 actions 里派发 generate_strategy（带 channelIds）
- 策略已生成且用户确认后 → 在 actions 里派发 generate_todos，让各渠道专员编写 30 天 To-Do
- 用户新增渠道或要求调整策略 → 派发 generate_strategy（只带新增/调整的 channelIds，可带 feedback）
- 计划执行期 → 陪伴用户执行：催促、鼓励、答疑；用户问今天要做什么时用 read_todos 工具查询

# 可用渠道目录（channelIds 必须从这里选）
${formatChannelCatalog()}

# Skill 目录（渐进式载入：如需某份方法论全文，返回 load_skills，我会把全文给你后你再继续）
${formatSkillCatalog()}

# 当前状态
- 用户个人档案：
${input.userProfileDoc || '（暂无，还在积累）'}
- 项目档案：
${input.projectProfileDoc || '（暂无，还在积累）'}
- 市场策略：${input.hasStrategy ? `已生成，覆盖渠道 [${input.channels.join(', ')}]` : '尚未生成'}
- 30 天 To-Do：${input.hasTodos ? '已生成' : '尚未生成'}

# 输出格式（严格 JSON，不要任何其他文字）
{
  "reply": "给用户的话",
  "optionCard": { "question": "...", "multi": false, "options": [{"id":"...","label":"...","description":"..."}], "allowCustom": false } 或 null,
  "actions": [{"type":"generate_strategy","channelIds":["..."],"feedback":"可选"} 或 {"type":"generate_todos","channelIds":["..."]}] 或 [],
  "load_skills": ["skill-id"] 仅当需要召回方法论全文时,
  "read_todos": {"date":"YYYY-MM-DD"} 仅当需要读取用户某天的 To-Do 时
}`;
}

function historyToMessages(history: ChatMessage[], max = 16): OpenRouterMessage[] {
  return history.slice(-max).map((m) => ({
    role: m.role,
    content:
      m.card?.kind === 'options' && m.card.card.answered
        ? `${m.content}\n[用户在选项卡中选择了：${m.card.card.answered.join('、')}]`
        : m.content,
  }));
}

export async function runDirector(input: DirectorInput): Promise<DirectorResponse> {
  if (isMockMode()) {
    return mockDirector({
      history: input.history,
      message: input.message,
      hasStrategy: input.hasStrategy,
      hasTodos: input.hasTodos,
      channels: input.channels,
    });
  }

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: buildSystemPrompt(input) },
    ...historyToMessages(input.history),
    { role: 'user', content: input.message },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const out = await callOpenRouterJson<DirectorLlmOutput>(messages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // 工具：渐进式召回 skill 全文
    if (out.load_skills && out.load_skills.length > 0 && round < MAX_TOOL_ROUNDS - 1) {
      const content = loadSkillContents(out.load_skills.slice(0, 2));
      messages.push({
        role: 'assistant',
        content: JSON.stringify({ load_skills: out.load_skills }),
      });
      messages.push({
        role: 'user',
        content: `[系统] 以下是你请求的 Skill 全文，请基于它继续完成回复：\n\n${content || '（未找到对应 skill）'}`,
      });
      continue;
    }

    // 工具：读取某一天的 To-Do
    if (out.read_todos?.date && round < MAX_TOOL_ROUNDS - 1) {
      const date = out.read_todos.date;
      const todos = input.todos.filter((t) => t.date === date);
      const summary =
        todos.length === 0
          ? `（${date} 没有安排 To-Do）`
          : todos
              .map(
                (t) =>
                  `- ${t.time ?? ''} [${t.channelName}] ${t.title}（状态：${t.status}）`
              )
              .join('\n');
      messages.push({
        role: 'assistant',
        content: JSON.stringify({ read_todos: out.read_todos }),
      });
      messages.push({
        role: 'user',
        content: `[系统] ${date} 的 To-Do 如下：\n${summary}\n请基于此继续完成回复。`,
      });
      continue;
    }

    return {
      reply: out.reply ?? '……我想一下，你再说一遍你的问题？',
      optionCard: out.optionCard ?? null,
      actions: out.actions ?? [],
    };
  }

  return { reply: '这个问题我需要再确认一下，你能换个说法再问我一次吗？', actions: [] };
}
