import Image from 'next/image';
import ChannelLogo from '@/components/ChannelLogo';
import {
  launchDirectories,
  type LaunchDirectory,
} from '@/lib/directories/data';
import { BRAND_MISSION } from '@/lib/brand';

type ChannelItem = {
  id: string;
  name: string;
  nameZh: string;
};

const CHANNELS: ChannelItem[] = [
  { id: 'twitter_x', name: 'X / Twitter', nameZh: 'X / Twitter' },
  { id: 'linkedin', name: 'LinkedIn', nameZh: 'LinkedIn' },
  { id: 'reddit', name: 'Reddit', nameZh: 'Reddit' },
  { id: 'hacker_news', name: 'Hacker News', nameZh: 'Hacker News' },
  { id: 'indie_hackers', name: 'Indie Hackers', nameZh: 'Indie Hackers' },
  { id: 'product_hunt', name: 'Product Hunt', nameZh: 'Product Hunt' },
  { id: 'github_growth', name: 'GitHub', nameZh: 'GitHub' },
  { id: 'xiaohongshu', name: 'Xiaohongshu', nameZh: '小红书' },
  { id: 'wechat_official', name: 'WeChat Official', nameZh: '微信公众号' },
  { id: 'user_outreach', name: 'Private Outreach', nameZh: '私域触达' },
  { id: 'tiktok', name: 'TikTok', nameZh: 'TikTok' },
  { id: 'youtube', name: 'YouTube', nameZh: 'YouTube' },
  { id: 'instagram', name: 'Instagram', nameZh: 'Instagram' },
  { id: 'website_copy', name: 'Website', nameZh: '官网转化' },
  { id: 'seo', name: 'SEO', nameZh: 'SEO' },
  { id: 'directory', name: 'Directories', nameZh: '产品目录' },
  { id: 'user_interview', name: 'User Interviews', nameZh: '用户访谈' },
  { id: 'competitor_research', name: 'Competitor Research', nameZh: '竞品研究' },
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
      <span>{isZh ? channel.nameZh : channel.name}</span>
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
      <p className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 sm:text-xs">
        {isZh
          ? '同一个推广目标，每个渠道各司其职'
          : 'One campaign. Every channel plays its part.'}
      </p>

      <div
        className="hero-marquee mt-5 sm:mt-6"
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
        className="hero-marquee hero-marquee-reverse mt-3"
        aria-label={
          isZh ? '热门产品发布目录' : 'Popular product launch directories'
        }
      >
        <div className="hero-marquee-track">
          <div className="hero-marquee-group">
            {FEATURED_DIRECTORIES.map((directory) => (
              <DirectoryCard key={directory.domain} directory={directory} />
            ))}
          </div>
          <div className="hero-marquee-group" aria-hidden>
            {FEATURED_DIRECTORIES.map((directory) => (
              <DirectoryCard
                key={`duplicate-${directory.domain}`}
                directory={directory}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 sm:mt-8 sm:text-xs">
        {BRAND_MISSION}
      </p>
    </div>
  );
}
