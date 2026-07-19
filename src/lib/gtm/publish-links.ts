/**
 * 各渠道发布页跳转。
 * 能带正文的渠道通过 URL 参数预填；其余渠道复制到剪贴板后跳转发布页。
 */

export interface PublishTarget {
  /** 是否能通过 URL 把内容带过去 */
  prefills: boolean;
  url: (text: string) => string;
  label: string;
  labelEn: string;
}

const TARGETS: Record<string, PublishTarget> = {
  xiaohongshu: {
    prefills: false,
    url: () => 'https://creator.xiaohongshu.com/publish/publish',
    label: '打开小红书创作中心',
    labelEn: 'Open Xiaohongshu Creator',
  },
  twitter_x: {
    prefills: true,
    url: (text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 5000))}`,
    label: '打开 X 发布框',
    labelEn: 'Open X composer',
  },
  linkedin: {
    prefills: true,
    url: (text) =>
      `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text.slice(0, 2800))}`,
    label: '打开 LinkedIn 发布框',
    labelEn: 'Open LinkedIn composer',
  },
  reddit: {
    prefills: true,
    url: (text) => {
      const [title, ...rest] = text.split('\n');
      return `https://www.reddit.com/submit?title=${encodeURIComponent(title.slice(0, 280))}&text=${encodeURIComponent(rest.join('\n').slice(0, 8000))}&type=TEXT`;
    },
    label: '打开 Reddit 发帖页',
    labelEn: 'Open Reddit submit',
  },
  wechat_official: {
    prefills: false,
    url: () => 'https://mp.weixin.qq.com/',
    label: '打开公众号后台',
    labelEn: 'Open WeChat Official',
  },
  user_outreach: {
    prefills: false,
    url: () => 'https://web.wechat.com/',
    label: '打开微信',
    labelEn: 'Open WeChat',
  },
  product_hunt: {
    prefills: false,
    url: () => 'https://www.producthunt.com/posts/new',
    label: '打开 Product Hunt',
    labelEn: 'Open Product Hunt',
  },
  github_growth: {
    prefills: false,
    url: () => 'https://github.com/',
    label: '打开 GitHub',
    labelEn: 'Open GitHub',
  },
};

const FALLBACK: PublishTarget = {
  prefills: false,
  url: () => '',
  label: '复制内容',
  labelEn: 'Copy content',
};

export function getPublishTarget(channelId: string): PublishTarget {
  return TARGETS[channelId] ?? FALLBACK;
}

/** 复制内容到剪贴板并跳转到发布页；返回是否复制成功 */
export async function publishTo(
  channelId: string,
  text: string
): Promise<boolean> {
  const target = getPublishTarget(channelId);
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    copied = false;
  }
  const url = target.url(text);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return copied;
}
