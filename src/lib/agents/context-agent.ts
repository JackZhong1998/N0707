/**
 * 上下文管理 Agent（Context Agent）
 *
 * 将用户与市场总监的散乱对话总结为两份核心档案：
 * (a) 用户个人档案（身份背景等）
 * (b) 项目档案
 *
 * 档案随对话单次总结、不断累积，作为长期上下文背景，
 * 以变量形式嵌入其他所有 Agent 的 System Prompt。
 */

import { callOpenRouterJson, type OpenRouterMessage } from '@/lib/openrouter';
import type { ChatMessage, ContextResponse } from '@/lib/gtm/types';
import { isMockMode, mockContext } from './mock';

export interface ContextInput {
  recentMessages: ChatMessage[];
  userProfileDoc: string;
  projectProfileDoc: string;
  locale: string;
}

export async function runContextAgent(input: ContextInput): Promise<ContextResponse> {
  if (isMockMode()) {
    return mockContext(input);
  }

  const isZh = input.locale !== 'en';
  const transcript = input.recentMessages
    .map((m) => `${m.role === 'user' ? '用户' : '市场总监'}：${m.content}`)
    .join('\n');

  const system = `你是 NowBuild 的「上下文管理 Agent」。你的唯一职责：把用户与市场总监的对话增量总结进两份长期档案。

# 规则
1. 在已有档案的基础上累积更新——保留已有信息，合并新信息，去重，修正被新对话推翻的旧结论
2. 用户个人档案只记录与"这个人"有关的：身份背景、职业经历、技能、表达风格、时间投入、个人诉求
3. 项目档案只记录与"这个产品/项目"有关的：产品定义、解决的问题、目标人群、核心价值、产品状态、渠道决策、策略共识
4. 用简洁的 markdown 分节呈现，每份档案不超过 600 字
5. 没有新信息的部分保持原样
6. ${isZh ? '用中文输出' : 'Output in English'}

# 输出格式（严格 JSON）
{"userProfileDoc": "markdown", "projectProfileDoc": "markdown"}`;

  const user = `# 已有用户个人档案
${input.userProfileDoc || '（空）'}

# 已有项目档案
${input.projectProfileDoc || '（空）'}

# 新增对话
${transcript}

请输出累积更新后的两份档案。`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  const out = await callOpenRouterJson<ContextResponse>(messages, {
    temperature: 0.2,
    maxTokens: 2048,
  });

  return {
    userProfileDoc: out.userProfileDoc || input.userProfileDoc,
    projectProfileDoc: out.projectProfileDoc || input.projectProfileDoc,
  };
}
