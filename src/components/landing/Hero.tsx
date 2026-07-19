'use client';

/**
 * Hero — “一个人打着灯，去寻找一群人”
 *
 * 布局：中间是一块常亮的“展板”——GTM 标题、副标题与 CTA 融在背景里；
 * 两侧挂着来自世界各地的用户画像，鼠标（或手指）是一支手电筒，
 * 只在左右两侧的区域内移动，照到哪里，哪里的人就显现出来。
 *
 * 性能：光斑与遮罩只靠 transform 移动（合成器合成，不触发整屏重绘）；
 * 区块离开视口或页面隐藏时暂停动画。
 */

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

/** 角色分布在左右两侧，覆盖不同地区与人种（中间留给常亮展板） */
const CHARACTERS = [
  // 左侧 — 多元角色
  { src: '/characters/color/char-founder-woman.webp', left: '3%', top: '8%', size: 150, rotate: -4 },
  { src: '/characters/color/char-barista-dog.webp', left: '14%', top: '28%', size: 145, rotate: 3 },
  { src: '/characters/color/char-gardener-bird.webp', left: '3%', top: '50%', size: 155, rotate: 2 },
  { src: '/characters/color/char-coder-shiba.webp', left: '14%', top: '70%', size: 150, rotate: -3 },
  { src: '/characters/color/char-painter-rabbit.webp', left: '5%', top: '78%', size: 130, rotate: 4 },
  // 右侧 — 多元角色
  { src: '/characters/color/char-woman-cat.webp', left: '84%', top: '10%', size: 150, rotate: 4 },
  { src: '/characters/color/char-cyclist-fox.webp', left: '72%', top: '30%', size: 145, rotate: -3 },
  { src: '/characters/color/char-maker-iguana.webp', left: '85%', top: '50%', size: 150, rotate: 3 },
  { src: '/characters/color/char-bench-friends.webp', left: '71%', top: '68%', size: 155, rotate: -2 },
  { src: '/characters/color/char-analyst-cat.webp', left: '86%', top: '78%', size: 135, rotate: 2 },
];

/** 无交互时光斑巡游的锚点 — 只在左右两侧游走 */
const ROAM_PATH: Array<[number, number]> = [
  [0.09, 0.18], [0.2, 0.4], [0.08, 0.62], [0.2, 0.8],
  [0.88, 0.78], [0.78, 0.55], [0.9, 0.32], [0.79, 0.16],
];

const HOLE_SIZE = 8000;

/** 手电筒只在两侧区域移动：中间是常亮展板，不需要照 */
function clampTorch(x: number, y: number): [number, number] {
  const cx = x < 0.5 ? Math.min(x, 0.3) : Math.max(x, 0.7);
  return [Math.min(Math.max(cx, 0.03), 0.97), Math.min(Math.max(y, 0.06), 0.94)];
}

export default function Hero() {
  const locale = useLocale();
  const isZh = locale === 'zh';
  const sectionRef = useRef<HTMLElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number; lastMove: number }>({
    x: 0.12,
    y: 0.35,
    lastMove: 0,
  });

  useEffect(() => {
    const el = sectionRef.current;
    const hole = holeRef.current;
    const glow = glowRef.current;
    if (!el || !hole || !glow) return;

    let raf = 0;
    let running = false;
    let visible = true;
    let cur = { x: 0.12, y: 0.35 };
    let roamIndex = 0;
    let roamTarget = ROAM_PATH[0];
    let torchR = 240;

    const applyRadius = () => {
      // 手电筒照亮范围收敛，突出两侧探照
      torchR = Math.round(Math.min(Math.max(140, window.innerWidth * 0.16), 260));
      el.style.setProperty('--torch-r', `${torchR}px`);
    };
    applyRadius();

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
      [tx, ty] = clampTorch(tx, ty);

      const ease = idle ? 0.012 : 0.16;
      cur = { x: cur.x + (tx - cur.x) * ease, y: cur.y + (ty - cur.y) * ease };

      const rect = el.getBoundingClientRect();
      const px = cur.x * rect.width;
      const py = cur.y * rect.height;
      hole.style.transform = `translate3d(${(px - HOLE_SIZE / 2).toFixed(1)}px, ${(py - HOLE_SIZE / 2).toFixed(1)}px, 0)`;
      glow.style.transform = `translate3d(${(px - torchR * 1.2).toFixed(1)}px, ${(py - torchR * 1.2).toFixed(1)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    io.observe(el);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', applyRadius);

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

    start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', applyRadius);
      el.removeEventListener('mousemove', onMouse);
      el.removeEventListener('touchmove', onTouch);
      el.removeEventListener('touchstart', onTouch);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] overflow-hidden bg-[#0a0a0a]"
      style={{ '--torch-r': '240px' } as React.CSSProperties}
    >
      {/* 底层：世界地图 + 挂在两侧的一群人（被手电筒照亮才清晰可见） */}
      <div className="absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/characters/world-map-lines.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          draggable={false}
          decoding="async"
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
            <div
              className="char-card rounded-2xl border border-zinc-700/80 bg-[#0d0d0d] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
              style={{ '--tilt': `${c.rotate > 0 ? -5 : 5}deg` } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt="" className="block w-full rounded-xl" draggable={false} loading="lazy" decoding="async" />
            </div>
          </div>
        ))}
        {/* 移动端：左右各两位角色 */}
        {[CHARACTERS[0], CHARACTERS[3], CHARACTERS[5], CHARACTERS[8]].map((c, i) => (
          <div
            key={`m-${i}`}
            className="absolute sm:hidden"
            style={{
              left: i < 2 ? '4%' : '68%',
              top: i % 2 === 0 ? '10%' : '72%',
              width: 105,
              transform: `rotate(${c.rotate}deg)`,
            }}
          >
            <div className="char-card rounded-xl border border-zinc-700/80 bg-[#0d0d0d] p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt="" className="block w-full rounded-lg" draggable={false} loading="lazy" decoding="async" />
            </div>
          </div>
        ))}
      </div>

      {/* 遮罩（跟随手电筒的透明圆洞）+ 暖光光斑：只用 transform 移动 */}
      <div ref={holeRef} className="torch-hole pointer-events-none" aria-hidden />
      <div ref={glowRef} className="torch-glow pointer-events-none" aria-hidden />

      {/* 中央展板常亮光：让标题区始终照亮、与背景融为一体 */}
      <div className="hero-board-light pointer-events-none" aria-hidden />

      {/* 文案层 — 垂直居中，略向下偏移 */}
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[100svh] max-w-5xl translate-y-4 flex-col items-center justify-center px-6 pb-20 pt-24 text-center sm:px-10 sm:translate-y-6">
        <p className="animate-fade-in-up index-label !text-[13px] !tracking-[0.18em] text-zinc-400 sm:!text-sm">
          {isZh
            ? '#一人公司 #Vibe Coder #每天 15–30 分钟'
            : '#SoloFounder #VibeCoder #15–30 min a day'}
        </p>

        <h1 className="animate-fade-in-up delay-100 mt-10 whitespace-nowrap font-[family-name:var(--font-elegant)] text-[13vw] font-semibold leading-[0.95] tracking-[-0.02em] text-[#f5efe4] [text-shadow:0_0_80px_rgba(255,240,214,0.32)] sm:text-7xl lg:text-[5.75rem]">
          Go To Market
        </h1>

        <p className="animate-fade-in-up delay-200 mt-8 text-2xl font-medium leading-snug text-zinc-50 sm:mt-10 sm:text-3xl lg:text-4xl">
          {isZh ? '建立个人影响力，触达付费用户' : 'Build personal influence. Reach paying users.'}
        </p>

        <p className="animate-fade-in-up delay-300 mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          {isZh
            ? '你做产品，AI 定渠道、想市场策略、每天生产获客内容'
            : 'You build the product — AI picks channels, shapes strategy, and drafts daily content to win customers'}
        </p>

        <div className="animate-fade-in-up delay-400 pointer-events-auto mt-12 sm:mt-14">
          <Link
            href="/sign-in"
            className="inline-flex h-14 items-center rounded-full bg-white px-10 text-base font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {isZh ? '开启 30 天获客行动' : 'Start your 30-day customer acquisition plan'}
          </Link>
        </div>
      </div>
    </section>
  );
}
