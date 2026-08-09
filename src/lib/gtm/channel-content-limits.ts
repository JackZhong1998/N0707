/** Platform field limits for publishable content (code-point length). */

export const XIAOHONGSHU_TITLE_MAX = 20;
export const XIAOHONGSHU_BODY_MAX = 1000;

function codePointLength(value: string): number {
  return [...value].length;
}

export function truncateCodePoints(value: string, max: number): string {
  const chars = [...value];
  if (chars.length <= max) return value;
  return chars.slice(0, max).join('');
}

export function channelTitleMax(channelId: string): number | null {
  if (channelId === 'xiaohongshu') return XIAOHONGSHU_TITLE_MAX;
  return null;
}

export function channelBodyMax(channelId: string): number | null {
  if (channelId === 'xiaohongshu') return XIAOHONGSHU_BODY_MAX;
  return null;
}

export function channelPublishConstraintsPrompt(channelId: string): string {
  if (channelId === 'xiaohongshu') {
    return `# 小红书硬性发布限制（必须遵守）
- title 必须 ≤ ${XIAOHONGSHU_TITLE_MAX} 个字符（按 Unicode 码点计，中文一字算一字符）；宁可短而有钩子，不要写长标题
- body（含话题标签）合计必须 ≤ ${XIAOHONGSHU_BODY_MAX} 个字符
- 超长内容会被截断；请一次写对长度`;
  }
  return '';
}

/** Clamp generated or stored content to channel publish limits. */
export function clampChannelContent(
  channelId: string,
  content: { title: string; body: string }
): { title: string; body: string } {
  let title = content.title.trim();
  let body = content.body.trim();
  const titleMax = channelTitleMax(channelId);
  const bodyMax = channelBodyMax(channelId);
  if (titleMax != null && codePointLength(title) > titleMax) {
    title = truncateCodePoints(title, titleMax);
  }
  if (bodyMax != null && codePointLength(body) > bodyMax) {
    body = truncateCodePoints(body, bodyMax);
  }
  return { title, body };
}
