type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
} as const;

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <span className={`font-display font-bold tracking-tight text-gray-900 ${sizeMap[size]} ${className}`}>
      NowBuild
    </span>
  );
}
