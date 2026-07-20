const DEFAULT_LIMIT = 140;

/** Split long text into tweet-sized segments (default 140 chars). */
export function splitTextToTweets(text: string, limit = DEFAULT_LIMIT): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= limit) return [trimmed];

  const segments: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      segments.push(remaining);
      break;
    }

    const breakAt = findBreakPoint(remaining, limit);
    const segment = remaining.slice(0, breakAt).trim();
    if (segment) segments.push(segment);
    remaining = remaining.slice(breakAt).trim();
  }

  return segments;
}

function findBreakPoint(text: string, limit: number): number {
  const chunk = text.slice(0, limit);
  const minBreak = Math.floor(limit * 0.5);

  const lastNewline = chunk.lastIndexOf('\n');
  if (lastNewline >= minBreak) return lastNewline;

  for (let i = chunk.length - 1; i >= minBreak; i--) {
    if ('。！？.!?…'.includes(chunk[i]!)) {
      return i + 1;
    }
  }

  const lastSpace = chunk.lastIndexOf(' ');
  if (lastSpace >= minBreak) return lastSpace;

  return limit;
}
