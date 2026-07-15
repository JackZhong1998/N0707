'use client';

/**
 * Hero — “一个人打着灯，去寻找一群人”
 *
 * 深色画布上，鼠标（或手指）是一支手电筒：光照到哪里，
 * 哪里就显现出挂在世界地图上的一群人 — 他们看见你，正欣喜地望向你。
 * 无交互时光会自己缓慢巡游，保证移动端与首次进入也能看到效果。
 */

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

const CHARACTERS = [
  { src: '/characters/char-woman-cat.webp', left: '6%', top: '14%', size: 150, rotate: -4 },
  { src: '/characters/char-man-dog.webp', left: '22%', top: '58%', size: 165, rotate: 3 },
  { src: '/characters/char-gardener-bird.webp', left: '40%', top: '10%', size: 140, rotate: 2 },
  { src: '/characters/char-cyclist-fox.webp', left: '58%', top: '62%', size: 160, rotate: -3 },
  { src: '/characters/char-painter-rabbit.webp', left: '74%', top: '16%', size: 150, rotate: 5 },
  { src: '/characters/char-bench-friends.webp', left: '87%', top: '54%', size: 155, rotate: -2 },
  { src: '/characters/char-fisherman-heron.webp', left: '12%', top: '78%', size: 135, rotate: 4 },
  { src: '/characters/char-barista-dog.webp', left: '44%', top: '76%', size: 145, rotate: -5 },
  { src: '/characters/char-stargazer-owl.webp', left: '68%', top: '38%', size: 140, rotate: 2 },
];

/** 无交互时光斑巡游的锚点（大致对应角色位置） */
const ROAM_PATH: Array<[number, number]> = [
  [0.12, 0.25], [0.3, 0.65], [0.46, 0.2], [0.63, 0.68],
  [0.8, 0.28], [0.9, 0.6], [0.5, 0.82], [0.72, 0.45],
];

export default function Hero() {
  const locale = useLocale();
  const isZh = locale === 'zh';
  const sectionRef = useRef<HTMLElement>(null);
  const pointer = useRef<{ x: number; y: number; lastMove: number }>({
    x: 0.5,
    y: 0.45,
    lastMove: 0,
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let raf = 0;
    let cur = { x: 0.5, y: 0.45 };
    let roamIndex = 0;
    let roamTarget = ROAM_PATH[0];

    const tick = (now: number) => {
      const p = pointer.current;
      const idle = now - p.lastMove > 2600;

      let tx = p.x;
      let ty = p.y;
      if (idle) {
        // 自动巡游：接近锚点后切换下一个
        const dx = roamTarget[0] - cur.x;
        const dy = roamTarget[1] - cur.y;
        if (Math.hypot(dx, dy) < 0.03) {
          roamIndex = (roamIndex + 1) % ROAM_PATH.length;
          roamTarget = ROAM_PATH[roamIndex];
        }
        tx = roamTarget[0];
        ty = roamTarget[1];
      }

      const ease = idle ? 0.012 : 0.16;
      cur = { x: cur.x + (tx - cur.x) * ease, y: cur.y + (ty - cur.y) * ease };
      el.style.setProperty('--torch-x', `${(cur.x * 100).toFixed(2)}%`);
      el.style.setProperty('--torch-y', `${(cur.y * 100).toFixed(2)}%`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      pointer.current = {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
        lastMove: performance.now(),
      };
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    el.addEventListener('mousemove', onMouse, { passive: true });
    el.addEventListener('touchmove', onTouch, { passive: true });
    el.addEventListener('touchstart', onTouch, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMouse);
      el.removeEventListener('touchmove', onTouch);
      el.removeEventListener('touchstart', onTouch);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] overflow-hidden bg-[#0a0a0a]"
      style={{ '--torch-r': 'clamp(160px, 24vw, 300px)' } as React.CSSProperties}
    >
      {/* 底层：被手电筒照亮才可见 — 世界地图 + 挂在地图上的一群人 */}
      <div className="flashlight-reveal absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/characters/world-map-lines.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          draggable={false}
        />
        <div className="bg-grid-dark absolute inset-0" />
        {CHARACTERS.map((c, i) => (
          <div
            key={i}
            className="absolute hidden sm:block"
            style={{
              left: c.left,
              top: c.top,
              width: c.size,
              transform: `rotate(${c.rotate}deg)`,
            }}
          >
            <div className="border border-zinc-700/80 bg-[#0d0d0d] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt="" className="block w-full" draggable={false} loading="lazy" />
            </div>
          </div>
        ))}
        {/* 移动端：更少、更大的角色 */}
        {CHARACTERS.slice(0, 4).map((c, i) => (
          <div
            key={`m-${i}`}
            className="absolute sm:hidden"
            style={{
              left: `${8 + i * 24}%`,
              top: i % 2 === 0 ? '12%' : '68%',
              width: 110,
              transform: `rotate(${c.rotate}deg)`,
            }}
          >
            <div className="border border-zinc-700/80 bg-[#0d0d0d] p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt="" className="block w-full" draggable={false} loading="lazy" />
            </div>
          </div>
        ))}
      </div>

      {/* 光晕 */}
      <div className="flashlight-glow pointer-events-none absolute inset-0" aria-hidden />

      {/* 文案层 */}
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pb-24 pt-28 sm:px-8">
        <p className="index-label animate-fade-in-up !text-zinc-500">
          {isZh ? 'GO-TO-MARKET · 给一人公司与 AI 独立开发者' : 'Go to market for the lonely vibe builder'}
        </p>

        <h1 className="display-tight animate-fade-in-up delay-100 mt-6 font-[family-name:var(--font-display)] text-[17vw] font-bold leading-[0.9] text-zinc-600 sm:text-[11rem] lg:text-[13rem]">
          <span className="text-white">G</span>o to
          <br />
          <span className="text-white">M</span>arke<span className="text-white">t</span>
        </h1>

        <div className="animate-fade-in-up delay-300 mt-10 max-w-xl">
          <p className="text-lg font-medium text-zinc-200 sm:text-xl">
            {isZh ? 'Focus on your taste.' : 'Focus on your taste.'}
          </p>
          <p className="mt-2 text-base leading-relaxed text-zinc-400 sm:text-lg">
            {isZh
              ? '我带你找到与你共鸣的人 — 你的第一批真实用户。'
              : "I'll find the people who resonate with what you build — your first hundred true users."}
          </p>
        </div>

        <div className="animate-fade-in-up delay-400 pointer-events-auto mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/sign-in"
            className="inline-flex h-12 items-center bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '开始 30 天冷启动' : 'Start your 30-day launch'}
          </Link>
          <a
            href="#system"
            className="inline-flex h-12 items-center border border-zinc-700 px-7 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            {isZh ? '看看它如何工作' : 'See how it works'}
          </a>
        </div>

        <p className="animate-fade-in delay-500 mt-14 flex items-center gap-2 text-xs tracking-wide text-zinc-600">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {isZh
            ? '移动你的手电筒 — 看看是谁在等你'
            : 'Move your flashlight — see who is waiting for you'}
        </p>
      </div>
    </section>
  );
}
