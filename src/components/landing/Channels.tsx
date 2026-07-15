import { getLocale } from 'next-intl/server';
import ChannelLogo from '@/components/ChannelLogo';

/**
 * 第二屏：全部支持的渠道
 * 不讲系统内部如何运作，只讲“你能在哪些地方、拿到什么”。
 */

const CHANNELS: Array<{
  id: string;
  name: string;
  nameEn: string;
  zh: string;
  en: string;
  market: string;
  marketEn: string;
}> = [
  {
    id: 'xiaohongshu',
    name: '小红书',
    nameEn: 'Xiaohongshu',
    zh: '每天一篇可直接发布的种草笔记与故事化内容',
    en: 'Story-driven posts ready to publish, every day',
    market: '中文市场',
    marketEn: 'CN market',
  },
  {
    id: 'user_outreach',
    name: '私域 / 朋友圈',
    nameEn: 'Private outreach',
    zh: '朋友圈文案与一对一私信话术，转化路径最短',
    en: 'Moments copy & DM scripts — shortest path to conversion',
    market: '中 / 英',
    marketEn: 'CN / EN',
  },
  {
    id: 'twitter_x',
    name: 'Twitter / X',
    nameEn: 'Twitter / X',
    zh: 'Build in public 的推文与 thread，写好待发',
    en: 'Build-in-public tweets & threads, drafted for you',
    market: '英文市场',
    marketEn: 'EN market',
  },
  {
    id: 'wechat_official',
    name: '微信公众号',
    nameEn: 'WeChat Official',
    zh: '一周一篇深度长文，沉淀专业信任',
    en: 'Weekly long-form articles that build trust',
    market: '中文市场',
    marketEn: 'CN market',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    nameEn: 'Reddit',
    zh: '以社区成员姿态渗透目标 subreddit 的发帖计划',
    en: 'Community-first post plans for target subreddits',
    market: '英文市场',
    marketEn: 'EN market',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    nameEn: 'LinkedIn',
    zh: '触达 B2B 决策者的专业内容',
    en: 'Professional content that reaches B2B buyers',
    market: '中 / 英',
    marketEn: 'CN / EN',
  },
  {
    id: 'product_hunt',
    name: 'Product Hunt',
    nameEn: 'Product Hunt',
    zh: '3 周蓄水 + 发布日冲榜的完整 SOP',
    en: 'A 3-week ramp-up plus full launch-day SOP',
    market: '英文市场',
    marketEn: 'EN market',
  },
  {
    id: 'github_growth',
    name: 'GitHub 增长',
    nameEn: 'GitHub Growth',
    zh: '开源项目的 README、发布与 Star 增长动作',
    en: 'README, releases and star-growth plays for OSS',
    market: '英文市场',
    marketEn: 'EN market',
  },
  {
    id: 'website_copy',
    name: '官网 / 落地页',
    nameEn: 'Website copy',
    zh: '所有流量的转化枢纽：Hero 与落地页文案',
    en: 'Hero & landing copy — where all traffic converts',
    market: '中 / 英',
    marketEn: 'CN / EN',
  },
  {
    id: 'user_interview',
    name: '用户访谈',
    nameEn: 'User interviews',
    zh: '访谈提纲与洞察整理，验证你真正的 PMF',
    en: 'Interview guides & synthesis to validate PMF',
    market: '中 / 英',
    marketEn: 'CN / EN',
  },
  {
    id: 'competitor_research',
    name: '竞品研究',
    nameEn: 'Competitor research',
    zh: '拆解竞品的增长飞轮与传播链，找到你的切口',
    en: 'Break down rivals’ growth loops to find your wedge',
    market: '中 / 英',
    marketEn: 'CN / EN',
  },
];

export default async function Channels() {
  const locale = await getLocale();
  const isZh = locale === 'zh';

  return (
    <section id="channels" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="index-label">{isZh ? '曝光' : 'Exposure'}</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {isZh
                ? '你会在这些地方曝光你的产品，获得关注'
                : 'This is where your product gets seen — and gets noticed'}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              {isZh
                ? '11 个渠道，每一个都有完整的打法。选定渠道后，每天要做的事和要发的内容都会替你备好 — 面向美国市场就写英文，面向中国市场就写中文。'
                : '11 channels, each with a complete playbook. Pick yours and every day’s tasks and copy are prepared — in English for the US market, in Chinese for China.'}
            </p>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CHANNELS.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col rounded-2xl bg-paper-dim p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <ChannelLogo channelId={c.id} size={22} />
                      <span className="text-sm font-semibold text-ink">
                        {isZh ? c.name : c.nameEn}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      {isZh ? c.market : c.marketEn}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">
                    {isZh ? c.zh : c.en}
                  </p>
                </div>
              ))}
              <div className="flex flex-col justify-center rounded-2xl bg-ink p-5">
                <p className="text-sm font-semibold text-white">
                  {isZh ? '还在增加中' : 'More coming'}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  {isZh
                    ? '每个渠道都配有完整方法论，持续更新。'
                    : 'Every channel ships with a full playbook, updated continuously.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
