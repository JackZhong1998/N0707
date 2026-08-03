/** Paid launch setup: channel selection plus the always-on Directory lane. */

import type { OptionCard } from './types';

export const FIXED_DIRECTORY_CHANNEL_ID = 'directory';

export function buildChannelSelectOptionCard(
  recommendations: Array<{
    channelId: string;
    channelName: string;
    priority: string;
  }>,
  isZh: boolean
): OptionCard {
  const selectable = recommendations.filter(
    (item) =>
      item.channelId !== FIXED_DIRECTORY_CHANNEL_ID &&
      item.priority !== 'skip'
  );
  return {
    question: isZh
      ? '选择接下来要执行的渠道（可多选）'
      : 'Choose the channels to execute next (select all that apply)',
    multi: true,
    options: selectable.map((item) => ({
      id: item.channelId,
      label: `${item.channelName} · ${item.priority}`,
    })),
  };
}

export function withFixedDirectory(channelIds: string[]): string[] {
  return [...new Set([...channelIds, FIXED_DIRECTORY_CHANNEL_ID])];
}
