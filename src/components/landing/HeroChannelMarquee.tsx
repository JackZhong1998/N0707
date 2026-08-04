import Image from 'next/image';
import ChannelLogo from '@/components/ChannelLogo';
import {
  launchDirectories,
  type LaunchDirectory,
} from '@/lib/directories/data';

type ChannelItem = {
  id: string;
  name: string;
  nameZh: string;
  skill: string;
  skillZh: string;
};

const CHANNELS: ChannelItem[] = [
  { id: 'twitter_x', name: 'X / Twitter', nameZh: 'X / Twitter', skill: 'Trends · Threads · Engagement', skillZh: '趋势选题 · Threads · 互动' },
  { id: 'linkedin', name: 'LinkedIn', nameZh: 'LinkedIn', skill: 'Expert POV · Founder Story', skillZh: '专业观点 · Founder Story' },
  { id: 'reddit', name: 'Reddit', nameZh: 'Reddit', skill: 'Community research · Native posts', skillZh: '社区研究 · 原生帖子' },
  { id: 'hacker_news', name: 'Hacker News', nameZh: 'Hacker News', skill: 'Show HN · Technical narrative', skillZh: 'Show HN · 技术叙事' },
  { id: 'indie_hackers', name: 'Indie Hackers', nameZh: 'Indie Hackers', skill: 'Build in public · Retrospectives', skillZh: 'Build in Public · 复盘' },
  { id: 'product_hunt', name: 'Product Hunt', nameZh: 'Product Hunt', skill: 'Launch strategy · Assets', skillZh: 'Launch 策划 · 发布素材' },
  { id: 'github_growth', name: 'GitHub', nameZh: 'GitHub', skill: 'README growth · Distribution', skillZh: 'README 增长 · 社区分发' },
  { id: 'xiaohongshu', name: 'Xiaohongshu', nameZh: '小红书', skill: 'Topics · Notes · Publishing', skillZh: '选题 · 笔记 · 发布' },
  { id: 'wechat_official', name: 'WeChat Official', nameZh: '微信公众号', skill: 'Articles · Headlines · Layout', skillZh: '长文 · 标题 · 排版' },
  { id: 'tiktok', name: 'TikTok', nameZh: 'TikTok', skill: 'Scripts · Hooks · Storyboards', skillZh: '脚本 · Hook · 分镜' },
  { id: 'youtube', name: 'YouTube', nameZh: 'YouTube', skill: 'Topics · Scripts · SEO', skillZh: '选题 · 脚本 · SEO' },
  { id: 'instagram', name: 'Instagram', nameZh: 'Instagram', skill: 'Reels · Carousel · Caption', skillZh: 'Reels · Carousel · Caption' },
  { id: 'seo', name: 'SEO', nameZh: 'SEO', skill: 'Keywords · Topic clusters · Pages', skillZh: '关键词 · 内容集群 · 落地页' },
  { id: 'website_copy', name: 'Website Conversion', nameZh: '官网转化', skill: 'Positioning · Hero · CTA', skillZh: '定位 · Hero · CTA' },
  { id: 'user_interview', name: 'User Interviews', nameZh: '用户访谈', skill: 'Recruiting · Guides · Validation', skillZh: '招募 · 提纲 · 需求验证' },
  { id: 'competitor_research', name: 'Competitor Research', nameZh: '竞品研究', skill: 'Positioning · Pricing · Gaps', skillZh: '定位 · 价格 · 差异机会' },
];

const FEATURED_DIRECTORY_NAMES = [
  'G2',
  'Capterra',
  'AlternativeTo',
  'Sourceforge',
  'SaaSHub',
  'BetaList',
  'Peerlist',
  'Uneed',
] as const;

const FEATURED_DIRECTORIES = FEATURED_DIRECTORY_NAMES.map((name) =>
  launchDirectories.find((directory) => directory.name === name),
).filter(
  (directory): directory is LaunchDirectory =>
    Boolean(directory && directory.image),
);

function ChannelCard({
  channel,
  isZh,
}: {
  channel: ChannelItem;
  isZh: boolean;
}) {
  return (
    <div className="hero-logo-card">
      <ChannelLogo channelId={channel.id} size={28} />
      <span className="leading-none">
        <span className="block text-[0.8125rem] font-semibold text-zinc-200">
          {isZh ? channel.nameZh : channel.name}
        </span>
        <span className="mt-1.5 block text-[0.65rem] font-normal text-zinc-500">
          {isZh ? channel.skillZh : channel.skill}
        </span>
      </span>
    </div>
  );
}

function DirectoryCard({ directory }: { directory: LaunchDirectory }) {
  return (
    <div className="hero-logo-card hero-directory-card">
      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-white">
        <Image
          src={directory.image!}
          alt=""
          fill
          sizes="28px"
          // Directory logos already come from a public image CDN. Fetch them in
          // the browser so a slow upstream logo cannot make Next's image proxy
          // return a noisy 504 while the landing page is loading.
          unoptimized
          className="object-contain"
        />
      </span>
      <span>{directory.name}</span>
    </div>
  );
}

export default function HeroChannelMarquee({ isZh }: { isZh: boolean }) {
  return (
    <div className="mt-8 sm:mt-10">
      <div
        className="hero-marquee"
        aria-label={isZh ? '目前支持的推广渠道' : 'Supported channel agents'}
      >
        <div className="hero-marquee-track">
          <div className="hero-marquee-group">
            {CHANNELS.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} isZh={isZh} />
            ))}
          </div>
          <div className="hero-marquee-group" aria-hidden>
            {CHANNELS.map((channel) => (
              <ChannelCard
                key={`duplicate-${channel.id}`}
                channel={channel}
                isZh={isZh}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="hero-marquee hero-directory-marquee hero-marquee-reverse mt-3"
        aria-label={
          isZh
            ? '支持自动匹配和提交的海外产品收录站'
            : 'Popular product launch directories'
        }
      >
        <div className="hero-marquee-track">
          {[0, 1, 2, 3].map((sequenceIndex) => (
            <div
              key={`directory-sequence-${sequenceIndex}`}
              className="hero-marquee-group"
              aria-hidden={sequenceIndex > 0 || undefined}
            >
              {FEATURED_DIRECTORIES.map((directory) => (
                <DirectoryCard
                  key={`${sequenceIndex}-${directory.domain}`}
                  directory={directory}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
