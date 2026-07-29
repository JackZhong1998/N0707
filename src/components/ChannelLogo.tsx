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
          {/* 小红书官方字标轮廓 */}
          <path
            fill="#fff"
            d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z"
          />
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
        <Badge bg="#07C160" size={size} radius={0.24}>
          {/* 微信官方双气泡 Logo */}
          <path
            fill="#fff"
            d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"
          />
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
    case 'hacker_news':
      return wrap(
        <Badge bg="#FF6600" size={size} radius={0.08}>
          <text
            x="12"
            y="16.8"
            textAnchor="middle"
            fontSize="13"
            fontWeight="500"
            fill="#fff"
            fontFamily="Verdana, Arial, sans-serif"
          >
            Y
          </text>
        </Badge>
      );
    case 'indie_hackers':
      return wrap(
        <Badge bg="#111827" size={size} radius={0.22}>
          <text
            x="12"
            y="16.2"
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="800"
            fill="#60A5FA"
            fontFamily="Helvetica Neue, Arial, sans-serif"
          >
            IH
          </text>
        </Badge>
      );
    case 'tiktok':
      return wrap(
        <Badge bg="#050505" size={size} radius={0.24}>
          <path d="M13.2 5.2v8.1a3.2 3.2 0 11-2.5-3.1" fill="none" stroke="#25F4EE" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M14.1 5.2c.5 2 1.7 3.1 3.7 3.4" fill="none" stroke="#FE2C55" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M13.7 5.2v8.1a3.2 3.2 0 11-2.5-3.1M13.7 5.2c.5 2 1.7 3.1 3.7 3.4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </Badge>
      );
    case 'youtube':
      return wrap(
        <Badge bg="#FF0000" size={size} radius={0.28}>
          <path d="M9.6 7.8l7 4.2-7 4.2z" fill="#fff" />
        </Badge>
      );
    case 'instagram':
      return wrap(
        <Badge bg="#E1306C" size={size} radius={0.28}>
          <rect x="5.8" y="5.8" width="12.4" height="12.4" rx="3.6" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="16.2" cy="7.9" r="0.9" fill="#fff" />
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
    case 'seo':
      return wrap(
        <Badge bg="#14B8A6" size={size} radius={0.24}>
          <circle cx="10.2" cy="10.2" r="4.4" fill="none" stroke="#fff" strokeWidth="1.7" />
          <path d="M13.6 13.6l4.3 4.3" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M7.8 10.4l1.5 1.5 3.1-3.4" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Badge>
      );
    case 'directory':
      return wrap(
        <Badge bg="#84CC16" size={size} radius={0.24}>
          <rect x="5.5" y="5.5" width="5.2" height="5.2" rx="1" fill="#fff" />
          <rect x="13.3" y="5.5" width="5.2" height="5.2" rx="1" fill="#fff" />
          <rect x="5.5" y="13.3" width="5.2" height="5.2" rx="1" fill="#fff" />
          <rect x="13.3" y="13.3" width="5.2" height="5.2" rx="1" fill="#fff" />
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
