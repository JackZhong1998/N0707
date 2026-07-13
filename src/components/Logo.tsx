'use client';

import Image from 'next/image';

type LogoProps = {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: { icon: 28, text: 'text-base' },
  md: { icon: 32, text: 'text-lg' },
  lg: { icon: 40, text: 'text-xl' },
} as const;

function LogoMark({ size }: { size: number }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      aria-hidden
    />
  );
}

export default function Logo({ showText = true, size = 'md', className = '' }: LogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={icon} />
      {showText && (
        <span className={`font-display font-bold tracking-tight text-gray-900 ${text}`}>
          NowBuild
        </span>
      )}
    </span>
  );
}

export { LogoMark };
