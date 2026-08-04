'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import ChannelLogo from '@/components/ChannelLogo';

type Localized = { zh: string; en: string };
type SkillCard = {
  id: string;
  name: Localized;
  understanding: Localized;
  action: Localized;
  tags: string[];
};

const SKILLS: SkillCard[] = [
  {
    id: 'reddit', name: { zh: 'Reddit', en: 'Reddit' },
    understanding: { zh: 'Reddit 用户愿意回应有用的讨论，但会迅速抵触伪装成分享的广告。', en: 'Reddit rewards useful discussion and quickly rejects promotion disguised as a post.' },
    action: { zh: '找到相关 Subreddits 和反复出现的真实问题，检查社区规则，再生成能引发讨论的原生帖子与回复。', en: 'Find relevant subreddits and recurring problems, check community rules, then prepare native discussions and replies that contribute before they promote.' },
    tags: ['Community Research', 'Native Discussion', 'Rule Check'],
  },
  {
    id: 'twitter_x', name: { zh: 'X / Twitter', en: 'X / Twitter' },
    understanding: { zh: 'X 靠第一句抢下注意力，内容要有明确观点，也要为后续对话留出空间。', en: 'The first line earns attention. A strong post carries one clear point of view and leaves room for conversation.' },
    action: { zh: '从 Campaign 主线中拆出多个选题角度，测试 Hook，生成单帖或 Thread，并准备互动回复和发布版式。', en: 'Turn the campaign theme into multiple angles, test hooks, build posts or threads, and prepare follow-up replies and publishing format.' },
    tags: ['Topic Mining', 'Hook Writing', 'Threads', 'Engagement'],
  },
  {
    id: 'linkedin', name: { zh: 'LinkedIn', en: 'LinkedIn' },
    understanding: { zh: 'LinkedIn 用户关心专业判断、真实经历和可信证据，不需要另一个空洞的“成功学”故事。', en: 'LinkedIn responds to professional judgment, lived experience, and credible proof—not another empty success story.' },
    action: { zh: '从产品决策、用户问题和构建过程中提炼 Founder POV，组织证据、段落节奏和讨论式 CTA。', en: 'Extract a founder point of view from product decisions and customer problems, then shape the proof, pacing, and conversation-led CTA.' },
    tags: ['Founder POV', 'Professional Story', 'Proof', 'Conversation CTA'],
  },
  {
    id: 'xiaohongshu', name: { zh: '小红书', en: 'Xiaohongshu' },
    understanding: { zh: '小红书同时是内容社区和搜索入口，选题、封面、标题与笔记结构需要一起工作。', en: 'Xiaohongshu is both a content community and a search surface. Topic, cover, title, and note structure have to work together.' },
    action: { zh: '研究搜索词与热门内容，提炼选题和标题，生成笔记结构、封面 Brief、标签与发布材料。', en: 'Research search terms and popular notes, select viable angles, then prepare the title, note structure, cover brief, tags, and publishing assets.' },
    tags: ['Trend Research', 'Search Topics', 'Note Structure', 'Cover Brief'],
  },
  {
    id: 'tiktok', name: { zh: 'TikTok', en: 'TikTok' },
    understanding: { zh: 'TikTok 需要在开头几秒让用户愿意停下，文案必须能被说出来，而不是只适合被阅读。', en: 'TikTok has to earn the next second immediately. The copy must sound natural when spoken, not merely look good on a page.' },
    action: { zh: '设计多个开场 Hook，将产品价值改写为口播脚本，并生成分镜、演示画面和拍摄 Brief。', en: 'Test opening hooks, turn the product value into a spoken script, and prepare the shot list, demo moments, and production brief.' },
    tags: ['Hook Testing', 'Spoken Script', 'Shot List', 'Production Brief'],
  },
  {
    id: 'youtube', name: { zh: 'YouTube', en: 'YouTube' },
    understanding: { zh: 'YouTube 的点击和留存来自同一个承诺：标题、缩略图、开场和视频内容必须对齐。', en: 'Click and retention come from the same promise. The title, thumbnail, opening, and video must stay aligned.' },
    action: { zh: '从搜索意图与用户问题中生成选题，准备标题与缩略图概念，完成脚本、章节和演示镜头。', en: 'Generate topics from search intent and user problems, then prepare title and thumbnail concepts, the script, chapters, and demo shots.' },
    tags: ['Search Intent', 'Title & Thumbnail', 'Script', 'Retention'],
  },
  {
    id: 'seo', name: { zh: 'SEO', en: 'SEO' },
    understanding: { zh: 'SEO 不是一篇文章塞入更多关键词，而是围绕用户搜索意图建立可持续扩展的内容结构。', en: 'SEO is not adding more keywords to one article. It is building a connected content structure around real search intent.' },
    action: { zh: '识别搜索意图，组织关键词集群，安排支柱页、支持内容与内链，并生成可执行的 Content Brief。', en: 'Identify intent, organize keyword clusters, plan pillar and supporting pages, map internal links, and produce executable content briefs.' },
    tags: ['Search Intent', 'Keyword Clusters', 'Content Briefs', 'Internal Links'],
  },
  {
    id: 'product_hunt', name: { zh: 'Product Hunt', en: 'Product Hunt' },
    understanding: { zh: 'Product Hunt 不只是上传一个产品，而是在一个集中时间窗里完成定位、讲述、素材与社区互动。', en: 'Product Hunt is not a simple product upload. Positioning, story, assets, and community interaction must come together inside one launch window.' },
    action: { zh: '准备 Tagline、Gallery 文案、Maker Comment、FAQ 和上线日互动素材，并检查 Launch Kit 是否完整。', en: 'Prepare the tagline, gallery copy, maker comment, FAQ, launch-day responses, and a completeness check for the launch kit.' },
    tags: ['Positioning', 'Launch Kit', 'Maker Comment', 'Launch Day'],
  },
  {
    id: 'directory', name: { zh: 'Directories', en: 'Directories' },
    understanding: { zh: '不是所有 Directory 都适合每个产品；不同平台的收录范围、字段、素材与验证要求也完全不同。', en: 'Not every directory fits every product, and each platform has different eligibility, fields, assets, and verification requirements.' },
    action: { zh: '根据产品匹配度给目录排序，按平台要求准备简介、标签和图片，执行已支持的提交并跟踪结果。', en: 'Rank directories by fit, prepare platform-specific descriptions and assets, complete supported submission flows, and track the result.' },
    tags: ['Fit Matching', 'Submission Assets', 'Form Filling', 'Status Tracking'],
  },
];

export default function Channels() {
  const locale = useLocale();
  const isZh = locale === 'zh';
  const lang: keyof Localized = isZh ? 'zh' : 'en';
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const drag = useRef({ active: false, x: 0, scrollLeft: 0 });

  const goTo = (index: number, smooth = true) => {
    const next = (index + SKILLS.length) % SKILLS.length;
    const viewport = viewportRef.current;
    const card = cardRefs.current[next];
    if (!viewport || !card) return;
    const left = card.offsetLeft - (viewport.clientWidth - card.clientWidth) / 2;
    viewport.scrollTo({ left, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
    setActive(next);
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => goTo(active + 1), 7000);
    return () => window.clearInterval(timer);
  }, [active, paused, reducedMotion]);

  const updateActiveFromScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const nextDistance = Math.abs(card.offsetLeft + card.clientWidth / 2 - center);
      if (nextDistance < distance) { distance = nextDistance; nearest = index; }
    });
    setActive(nearest);
  };

  return (
    <section id="channels" className="overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-16">
        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-end lg:gap-14">
          <div>
            <p className="index-label">{isZh ? '28+ 平台原生 SKILLS' : '28+ PLATFORM-NATIVE SKILLS'}</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold leading-[1.1] tracking-[-0.05em] text-ink sm:text-4xl lg:text-[2.8rem]">
              {isZh ? <>每个平台都有自己的语言。<br />每个 Skill 都知道该怎么做。</> : <>Every channel has its own language.<br />Every Skill knows how to work in it.</>}
            </h2>
          </div>
          <div>
            <p className="text-sm leading-7 text-ink-muted">
              {isZh ? '不是把同一篇文案改几个词后四处发布。NowBuild 把每个平台的用户心智、内容结构、社区规则和执行方法做成 Skills，让对应 Agent 产出真正适合该渠道的内容与行动。' : "NowBuild does not rewrite one post for every platform. Each Skill captures a channel's audience mindset, native formats, community rules, and execution methods—so the right Agent can produce work that genuinely belongs there."}
            </p>
            <p className="mt-3 text-sm font-bold text-ink">{isZh ? '不同渠道，不同理解，不同做法。' : 'Different channels. Different context. Different execution.'}</p>
          </div>
        </div>
      </div>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={viewportRef}
          tabIndex={0}
          role="region"
          aria-label={isZh ? '渠道 Skill 展示滑块' : 'Channel Skill showcase slider'}
          className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-min(39vw,230px))] pb-7 pt-2 outline-none sm:gap-5"
          onScroll={updateActiveFromScroll}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(active - 1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); goTo(active + 1); }
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') return;
            drag.current = { active: true, x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
            event.currentTarget.setPointerCapture(event.pointerId);
            setPaused(true);
          }}
          onPointerMove={(event) => {
            if (!drag.current.active) return;
            event.currentTarget.scrollLeft = drag.current.scrollLeft - (event.clientX - drag.current.x);
          }}
          onPointerUp={(event) => {
            drag.current.active = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            setPaused(false);
          }}
        >
          {SKILLS.map((skill, index) => (
            <article
              key={skill.id}
              ref={(node) => { cardRefs.current[index] = node; }}
              className={`w-[min(78vw,460px)] shrink-0 snap-center rounded-[1.75rem] border bg-white p-6 transition duration-500 sm:p-7 ${active === index ? 'scale-100 border-zinc-300 opacity-100 shadow-[0_24px_70px_rgba(13,16,17,0.10)]' : 'scale-[0.94] border-zinc-200 opacity-45'}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ChannelLogo channelId={skill.id} size={34} />
                  <h3 className="text-lg font-semibold text-ink">{skill.name[lang]}</h3>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[.14em] text-brand-800">CHANNEL SKILL</span>
              </div>

              <div className="mt-6 border-t border-zinc-200 pt-5">
                <p className="font-mono text-[9px] uppercase tracking-[.14em] text-zinc-400">{isZh ? '渠道理解' : 'CHANNEL UNDERSTANDING'}</p>
                <p className="mt-2 text-lg font-semibold leading-7 text-ink">{skill.understanding[lang]}</p>
              </div>

              <div className="mt-5">
                <p className="font-mono text-[9px] uppercase tracking-[.14em] text-zinc-400">{isZh ? 'SKILLS 会怎么做' : 'WHAT THE SKILLS DO'}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{skill.action[lang]}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {skill.tags.map((tag) => <span key={tag} className="rounded-md bg-brand-50 px-2.5 py-1.5 text-[9px] font-semibold text-brand-900">{tag}</span>)}
              </div>
            </article>
          ))}
        </div>

        <button type="button" onClick={() => goTo(active - 1)} aria-label={isZh ? '上一个渠道' : 'Previous channel'} className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-ink shadow-lg transition hover:border-brand-300 lg:flex">←</button>
        <button type="button" onClick={() => goTo(active + 1)} aria-label={isZh ? '下一个渠道' : 'Next channel'} className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-ink shadow-lg transition hover:border-brand-300 lg:flex">→</button>
      </div>

      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 pb-14 sm:px-8 sm:pb-16">
        <span className="w-12 shrink-0 font-mono text-[10px] font-semibold text-ink">{String(active + 1).padStart(2, '0')} / {String(SKILLS.length).padStart(2, '0')}</span>
        <div className="scrollbar-none flex flex-1 gap-1.5 overflow-x-auto">
          {SKILLS.map((skill, index) => (
            <button key={skill.id} type="button" onClick={() => goTo(index)} aria-label={skill.name[lang]} aria-current={active === index ? 'true' : undefined} className={`flex h-10 min-w-10 items-center justify-center rounded-xl border transition ${active === index ? 'border-brand-400 bg-brand-50' : 'border-zinc-200 bg-white opacity-55 hover:opacity-100'}`}>
              <ChannelLogo channelId={skill.id} size={22} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
