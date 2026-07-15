/**
 * 渠道品牌 Logo（内联 SVG，无外部请求，可在 Server/Client 组件中使用）
 * 用品牌色 + 简化标识让渠道一眼可辨，替代纯文字标签。
 */

import type { CSSProperties } from 'react';

function Badge({
  bg,
  children,
  size,
  radius = 0.22,
}: {
  bg: string;
  children: React.ReactNode;
  size: number;
  radius?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ display: 'inline-block', flexShrink: 0 } as CSSProperties}
    >
      <rect x="0" y="0" width="24" height="24" rx={24 * radius} fill={bg} />
      {children}
    </svg>
  );
}

export default function ChannelLogo({
  channelId,
  size = 16,
  className,
}: {
  channelId: string;
  size?: number;
  className?: string;
}) {
  const wrap = (node: React.ReactNode) => (
    <span className={className} style={{ display: 'inline-flex', lineHeight: 0 }}>
      {node}
    </span>
  );

  switch (channelId) {
    case 'xiaohongshu':
      return wrap(
        <Badge bg="#FF2442" size={size} radius={0.24}>
          <text
            x="12"
            y="16.2"
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="700"
            fill="#fff"
            fontFamily="PingFang SC, Noto Sans SC, sans-serif"
          >
            红
          </text>
        </Badge>
      );
    case 'user_outreach':
      return wrap(
        <Badge bg="#07C160" size={size} radius={0.24}>
          {/* 双气泡（微信/私域） */}
          <ellipse cx="10" cy="10.5" rx="5.6" ry="4.6" fill="#fff" />
          <path d="M7 16.5l1.2-2.6 2.6 1z" fill="#fff" />
          <ellipse cx="16" cy="14" rx="4.2" ry="3.5" fill="#fff" opacity="0.92" />
          <path d="M18.6 18.6l-0.8-2 -2 0.8z" fill="#fff" opacity="0.92" />
          <circle cx="8.2" cy="10.2" r="0.8" fill="#07C160" />
          <circle cx="11.8" cy="10.2" r="0.8" fill="#07C160" />
        </Badge>
      );
    case 'wechat_official':
      return wrap(
        <Badge bg="#576B95" size={size} radius={0.24}>
          <text
            x="12"
            y="16.2"
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="700"
            fill="#fff"
            fontFamily="PingFang SC, Noto Sans SC, sans-serif"
          >
            公
          </text>
        </Badge>
      );
    case 'twitter_x':
      return wrap(
        <Badge bg="#000000" size={size} radius={0.24}>
          <path
            d="M13.9 10.6L19.4 4.5h-1.6l-4.7 5.2-3.7-5.2H4.5l5.8 8.2-5.8 6.6h1.6l5-5.7 4 5.7h4.9l-6.1-8.7zm-1.8 2l-0.6-0.8-4.6-6.3h2l3.7 5.1 0.6 0.8 4.8 6.6h-2l-3.9-5.4z"
            fill="#fff"
          />
        </Badge>
      );
    case 'reddit':
      return wrap(
        <Badge bg="#FF4500" size={size} radius={0.5}>
          {/* 简化 reddit 外星人脸 */}
          <ellipse cx="12" cy="13.6" rx="7" ry="4.8" fill="#fff" />
          <circle cx="5.6" cy="12.4" r="1.5" fill="#fff" />
          <circle cx="18.4" cy="12.4" r="1.5" fill="#fff" />
          <circle cx="9.4" cy="13.2" r="1.15" fill="#FF4500" />
          <circle cx="14.6" cy="13.2" r="1.15" fill="#FF4500" />
          <path d="M9.7 15.9c1.4 1.1 3.2 1.1 4.6 0" stroke="#FF4500" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M12.6 8.8l0.9-3.2 2.8 0.8" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <circle cx="16.9" cy="6.2" r="1.1" fill="#fff" />
        </Badge>
      );
    case 'linkedin':
      return wrap(
        <Badge bg="#0A66C2" size={size} radius={0.18}>
          <text
            x="12"
            y="16.6"
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="800"
            fill="#fff"
            fontFamily="Helvetica Neue, Arial, sans-serif"
          >
            in
          </text>
        </Badge>
      );
    case 'product_hunt':
      return wrap(
        <Badge bg="#DA552F" size={size} radius={0.5}>
          <text
            x="12"
            y="16.6"
            textAnchor="middle"
            fontSize="12.5"
            fontWeight="800"
            fill="#fff"
            fontFamily="Helvetica Neue, Arial, sans-serif"
          >
            P
          </text>
        </Badge>
      );
    case 'github_growth':
      return wrap(
        <Badge bg="#181717" size={size} radius={0.5}>
          <path
            d="M12 4.8a7.3 7.3 0 00-2.3 14.2c0.4 0.07 0.5-0.16 0.5-0.35v-1.3c-2 0.44-2.5-0.86-2.5-0.86-0.33-0.85-0.8-1.07-0.8-1.07-0.66-0.45 0.05-0.44 0.05-0.44 0.73 0.05 1.1 0.75 1.1 0.75 0.65 1.1 1.7 0.8 2.1 0.6 0.07-0.47 0.26-0.8 0.46-0.97-1.62-0.19-3.3-0.81-3.3-3.6 0-0.8 0.28-1.45 0.75-1.96-0.08-0.19-0.33-0.94 0.07-1.95 0 0 0.6-0.2 2 0.75a7 7 0 013.66 0c1.4-0.94 2-0.75 2-0.75 0.4 1.01 0.15 1.76 0.07 1.95 0.47 0.51 0.75 1.16 0.75 1.96 0 2.8-1.7 3.4-3.32 3.58 0.26 0.23 0.5 0.67 0.5 1.35v2c0 0.2 0.13 0.42 0.5 0.35A7.3 7.3 0 0012 4.8z"
            fill="#fff"
          />
        </Badge>
      );
    case 'website_copy':
      return wrap(
        <Badge bg="#0EA5E9" size={size} radius={0.24}>
          <circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" strokeWidth="1.3" />
          <ellipse cx="12" cy="12" rx="2.8" ry="6.5" fill="none" stroke="#fff" strokeWidth="1.1" />
          <path d="M5.5 12h13M6.6 8.6h10.8M6.6 15.4h10.8" stroke="#fff" strokeWidth="1.1" />
        </Badge>
      );
    case 'user_interview':
      return wrap(
        <Badge bg="#8B5CF6" size={size} radius={0.24}>
          <rect x="9.6" y="5" width="4.8" height="8.4" rx="2.4" fill="#fff" />
          <path d="M7 11.5a5 5 0 0010 0" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M12 16.5v2.5M9.5 19h5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </Badge>
      );
    case 'competitor_research':
      return wrap(
        <Badge bg="#F59E0B" size={size} radius={0.24}>
          <circle cx="10.6" cy="10.6" r="4.6" fill="none" stroke="#fff" strokeWidth="1.6" />
          <path d="M14 14l4.6 4.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </Badge>
      );
    default:
      return wrap(
        <Badge bg="#71717A" size={size} radius={0.24}>
          <circle cx="12" cy="12" r="4.5" fill="#fff" />
        </Badge>
      );
  }
}
