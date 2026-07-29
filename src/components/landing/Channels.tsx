import { getLocale } from 'next-intl/server';
import ChannelLogo from '@/components/ChannelLogo';

const GROUPS_EN = [
  {
    index: '01',
    label: 'Create demand',
    output: 'Founder posts, visual stories, owned content, and video production briefs.',
    channels: [
      ['twitter_x', 'X / Twitter'],
      ['linkedin', 'LinkedIn'],
      ['xiaohongshu', 'Xiaohongshu'],
      ['wechat_official', 'WeChat'],
      ['tiktok', 'TikTok'],
      ['youtube', 'YouTube'],
    ],
  },
  {
    index: '02',
    label: 'Join conversations',
    output: 'Community-native discussions, launch packages, and developer stories.',
    channels: [
      ['reddit', 'Reddit'],
      ['hacker_news', 'Hacker News'],
      ['product_hunt', 'Product Hunt'],
      ['github_growth', 'GitHub'],
    ],
  },
  {
    index: '03',
    label: 'Capture intent',
    output: 'Search content, conversion pages, and automated submission to 76 supported directories.',
    channels: [
      ['seo', 'SEO / Website'],
      ['directory', 'Directories'],
    ],
  },
];

const GROUPS_ZH = [
  {
    index: '01',
    label: '让人看见',
    output: '创始人故事、图文内容、私域长文，以及可直接拍摄的视频方案。',
    channels: [
      ['twitter_x', 'X / Twitter'],
      ['linkedin', 'LinkedIn'],
      ['xiaohongshu', '小红书'],
      ['wechat_official', '微信公众号'],
      ['tiktok', 'TikTok'],
      ['youtube', 'YouTube'],
    ],
  },
  {
    index: '02',
    label: '走进讨论',
    output: '尊重社区语境的讨论内容、首发素材包，以及有实质信息的开发者故事。',
    channels: [
      ['reddit', 'Reddit'],
      ['hacker_news', 'Hacker News'],
      ['product_hunt', 'Product Hunt'],
      ['github_growth', 'GitHub'],
    ],
  },
  {
    index: '03',
    label: '接住需求',
    output: '承接搜索需求的内容、提升转化的官网文案，以及 76 个已支持目录的自动提交。',
    channels: [
      ['seo', 'SEO / 官网'],
      ['directory', '产品目录'],
    ],
  },
];

export default async function Channels() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const groups = isZh ? GROUPS_ZH : GROUPS_EN;

  return (
    <section id="channels" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end lg:gap-16">
          <div>
            <p className="index-label">
              {isZh ? '同一个目标，不同的表达' : 'One campaign. Native to every channel.'}
            </p>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
              {isZh
                ? <>不把同一篇文案，<br />硬塞进所有平台。</>
                : <>One strategy.<br />Adapted across the market.</>}
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-zinc-400">
            {isZh
              ? '团队共享同一套产品定位和推广目标，再按每个平台的内容习惯、沟通语气和用户期待，分别完成创作。'
              : 'The Agent Team shares one product position and campaign goal, then adapts the format, tone, and action to how each channel actually works.'}
          </p>
        </div>

        <div className="mt-10 border-y border-zinc-200">
          <div className="grid gap-3 py-4 sm:grid-cols-[150px_1fr] sm:items-center">
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-lime-700">
              {isZh ? '全渠道共享的推广简报' : 'Shared campaign brief'}
            </p>
            <p className="text-sm font-semibold text-ink">
              {isZh
                ? '产品事实 · 目标用户 · 核心价值 · 可信证据 · 本轮目标'
                : 'Product facts · Audience · Core promise · Proof · Campaign goal'}
            </p>
          </div>

          {groups.map((group) => (
            <article
              key={group.index}
              className="grid gap-5 border-t border-zinc-200 py-6 lg:grid-cols-[180px_1fr_360px] lg:items-center"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] text-lime-700">{group.index}</span>
                <h3 className="text-lg font-semibold text-ink">{group.label}</h3>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {group.channels.map(([channelId, label]) => (
                  <span key={channelId} className="flex items-center gap-2 text-xs font-semibold text-ink">
                    <ChannelLogo channelId={channelId} size={22} />
                    {label}
                  </span>
                ))}
              </div>

              <p className="text-sm leading-6 text-ink-muted lg:border-l lg:border-zinc-200 lg:pl-6">
                {group.output}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
