'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

type HeroBlueprintProps = {
  isZh: boolean;
  weeks: string[][];
  channels: string[];
};

export default function HeroBlueprint({ isZh, weeks, channels }: HeroBlueprintProps) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.2,
      });

      timeline
        .from('[data-blueprint-shell]', {
          autoAlpha: 0,
          y: 28,
          scale: 0.985,
          duration: 0.8,
        })
        .from(
          '[data-blueprint-heading]',
          { autoAlpha: 0, x: -14, duration: 0.45 },
          '-=0.45',
        )
        .from(
          '[data-blueprint-week]',
          {
            autoAlpha: 0,
            y: 18,
            duration: 0.5,
            stagger: 0.13,
          },
          '-=0.32',
        );

      const cards = gsap.utils.toArray<HTMLElement>('[data-blueprint-week]');
      cards.forEach((card, index) => {
        const dot = card.querySelector('[data-blueprint-dot]');
        timeline
          .to(
            card,
            {
              borderColor: 'rgba(198, 244, 85, 0.35)',
              backgroundColor: 'rgba(183, 242, 58, 0.08)',
              duration: 0.32,
            },
            index === 0 ? '-=0.08' : '-=0.04',
          )
          .to(
            dot,
            {
              backgroundColor: '#b7f23a',
              boxShadow: '0 0 14px rgba(183, 242, 58, 0.8)',
              duration: 0.28,
            },
            '<',
          );
      });

      timeline
        .from(
          '[data-blueprint-channel]',
          { autoAlpha: 0, y: 8, duration: 0.35, stagger: 0.06 },
          '-=0.08',
        )
        .from(
          '[data-blueprint-task]',
          { autoAlpha: 0, x: -16, y: 10, duration: 0.55 },
          '-=0.2',
        );
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div ref={root} className="relative">
      <div
        data-blueprint-shell
        className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl sm:p-6"
      >
        <div
          data-blueprint-heading
          className="flex items-start justify-between gap-5 border-b border-white/10 pb-5"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              {isZh ? '产品推广蓝图' : 'Product launch blueprint'}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {isZh ? '从产品定位到 30 天分发' : 'From positioning to 30 days of distribution'}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            {isZh ? '策略已连接' : 'One strategy'}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {weeks.map(([week, title, detail], index) => (
            <article
              key={week}
              data-blueprint-week
              className="rounded-2xl border border-white/[0.07] bg-black/30 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                  {week}
                </span>
                <span
                  data-blueprint-dot
                  className={`h-2 w-2 rounded-full ${
                    index === 0
                      ? 'bg-brand-400 shadow-[0_0_12px_rgba(183,242,58,.75)]'
                      : 'bg-zinc-700'
                  }`}
                />
              </div>
              <p className="mt-5 text-sm font-semibold text-zinc-100">{title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-white/[0.055] p-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            {isZh ? '一套定位，分发到整个网络' : 'One position, distributed across the web'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {channels.map((channel) => (
              <span
                key={channel}
                data-blueprint-channel
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-zinc-300"
              >
                {channel}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        data-blueprint-task
        className="absolute -bottom-4 -left-4 rounded-2xl border border-white/10 bg-night-panel px-4 py-3 shadow-xl sm:-left-8"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          {isZh ? '今天的任务' : 'Today’s work'}
        </p>
        <p className="mt-1 text-sm font-medium text-white">
          {isZh ? '已写好，等待你审核' : 'Drafted and ready for review'}
        </p>
      </div>
    </div>
  );
}
