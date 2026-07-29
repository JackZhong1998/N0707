import { ImageResponse } from 'next/og';
import { BRAND_FILM_END_CARD } from '@/lib/brand';

export const alt = 'NowBuild — Your 30-Day Agent Launch Team';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isZh = locale === 'zh';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#fff',
          background: '#090b0c',
          padding: '64px 72px',
          fontFamily: 'Arial, sans-serif',
          backgroundImage:
            'radial-gradient(circle at 78% 30%, rgba(183,242,58,.18), transparent 36%), linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)',
          backgroundSize: 'auto, 72px 72px, 72px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 32, fontWeight: 700 }}>
            <span style={{ color: '#b7f23a' }}>N</span>owBuild
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '12px 20px', fontSize: 18, color: '#d4d4d8' }}>
            {isZh ? '面向独立开发者' : 'For solo founders'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
          <div style={{ color: '#d5fa7b', fontSize: 20, letterSpacing: 4, textTransform: 'uppercase' }}>
            {isZh ? '软件产品冷启动的 30 天 AGENT LAUNCH TEAM' : 'A 30-DAY AGENT LAUNCH TEAM FOR SOFTWARE PRODUCTS'}
          </div>
          <div style={{ marginTop: 24, fontSize: 70, lineHeight: 1.04, letterSpacing: -3, fontWeight: 700 }}>
            {isZh ? '一个产品，一套 Campaign，一支协同团队。' : 'One product. One campaign. A coordinated team.'}
          </div>
        </div>

        <div style={{ display: 'flex', color: '#a1a1aa', fontSize: 18, letterSpacing: 1 }}>
          {BRAND_FILM_END_CARD}
        </div>
      </div>
    ),
    size,
  );
}
