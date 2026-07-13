import { callOpenRouterJson } from '@/lib/openrouter';
import type { ChatMessage, ProductProfile } from '@/lib/gtm/types';
import { KICKOFF_MAX_ROUNDS } from '@/lib/gtm/types';
import {
  buildMemoryContext,
  compactHistory,
  type MemoryPayload,
} from '@/lib/gtm/memory';
import {
  KICKOFF_SYSTEM_PROMPT,
  KICKOFF_REQUIRED_SLOTS,
  KICKOFF_OPTIONAL_SLOTS,
} from './prompts';
import { getKickoffSkillContent } from './skills/registry';

export interface KickoffResult {
  reply: string;
  extractedFacts: Partial<ProductProfile>;
  readyForChannels: boolean;
}

function missingSlots(profile: ProductProfile): string[] {
  const missing: string[] = [];
  for (const slot of KICKOFF_REQUIRED_SLOTS) {
    if (!profile[slot.key as keyof ProductProfile]) {
      missing.push(`[必填] ${slot.label}`);
    }
  }
  for (const slot of KICKOFF_OPTIONAL_SLOTS) {
    if (!profile[slot.key as keyof ProductProfile]) {
      missing.push(`[可选] ${slot.label}`);
    }
  }
  return missing;
}

export async function runKickoffChat(
  memory: MemoryPayload,
  history: ChatMessage[],
  userMessage: string,
  roundCount: number
): Promise<KickoffResult> {
  const missing = missingSlots(memory.profile);
  const requiredMissing = missing.filter((m) => m.startsWith('[必填]'));

  const contextBlock = `${buildMemoryContext(memory)}

【Go-to-Market Playbook 原文（Kickoff 方法论参考）】
${getKickoffSkillContent()}

【尚未收集的信息槽位】
${missing.length > 0 ? missing.join('\n') : '（全部收集完毕）'}

【对话轮次】第 ${roundCount}/${KICKOFF_MAX_ROUNDS} 轮
${
  requiredMissing.length === 0
    ? '所有必填槽位已收集完毕：本轮请给出策略预判总结并设置 readyForChannels = true。'
    : roundCount >= KICKOFF_MAX_ROUNDS
      ? '已达轮次上限：请基于现有信息做合理假设并明确说出假设，然后设置 readyForChannels = true。'
      : '优先追问必填槽位中最重要的一个。'
}`;

  const messages = [
    { role: 'system' as const, content: KICKOFF_SYSTEM_PROMPT },
    { role: 'user' as const, content: contextBlock },
    ...compactHistory(history).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const parsed = await callOpenRouterJson<{
    reply?: string;
    extractedFacts?: Partial<ProductProfile>;
    readyForChannels?: boolean;
  }>(messages, { temperature: 0.7, maxTokens: 1200 });

  // 服务端兜底：必填槽位没齐（且未到轮次上限），LLM 说 ready 也不放行
  const mergedProfile = { ...memory.profile, ...(parsed.extractedFacts ?? {}) };
  const stillMissingRequired = KICKOFF_REQUIRED_SLOTS.some(
    (slot) => !mergedProfile[slot.key as keyof ProductProfile]
  );
  const ready =
    (parsed.readyForChannels ?? false) &&
    (!stillMissingRequired || roundCount >= KICKOFF_MAX_ROUNDS);

  return {
    reply: parsed.reply ?? '抱歉，我没组织好语言，能再说一次吗？',
    extractedFacts: parsed.extractedFacts ?? {},
    readyForChannels: ready || roundCount >= KICKOFF_MAX_ROUNDS,
  };
}
