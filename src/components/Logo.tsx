/**
 * NowBuild's wide, heavy NB monogram.
 *
 * The N follows the surface foreground while the B carries the brand lime.
 */
const LOGO_B_PATH =
  'M56.758 32.849H83.857C90.442 32.849 94.559 36.101 94.559 40.67C94.559 44.924 92.227 47.736 88.385 48.971C92.913 50 96 52.744 96 56.929C96 62.897 90.923 67.151 83.994 67.151H56.758V32.849Z';

export function LogoLetterB({
  className = 'inline-block h-[0.72em] w-[0.84em]',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="56.758 32.849 39.242 34.302"
      aria-hidden="true"
      focusable="false"
    >
      <path d={LOGO_B_PATH} fill="currentColor" />
    </svg>
  );
}

export function LogoMark({
  className = 'h-7 w-[70px]',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 30 100 40"
      role="img"
      aria-label="NowBuild NB"
    >
      <path
        d="M4 32.849H27.806L36.793 40.738V32.849H56.003V67.151H33.706L26.571 60.84V67.151H4V32.849Z"
        fill="currentColor"
      />
      <path
        d={LOGO_B_PATH}
        className="fill-brand-500"
      />
    </svg>
  );
}

export default function Logo({
  dark = false,
  showTagline = false,
  compact = false,
}: {
  dark?: boolean;
  showTagline?: boolean;
  compact?: boolean;
}) {
  return (
    <span className="inline-flex select-none items-center">
      <LogoMark
        className={`${compact ? 'h-[18px] w-[45px]' : 'h-7 w-[70px]'} shrink-0 ${
          dark ? 'text-canvas' : 'text-ink'
        }`}
      />
      <span
        className={`${compact ? 'ml-2' : 'ml-2.5'} font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.045em] ${
          dark ? 'text-canvas' : 'text-ink'
        }`}
      >
        NowBuild
      </span>
      {showTagline && (
        <span
          className={`ml-2 border-l pl-2 text-sm font-medium tracking-[-0.02em] ${
            dark
              ? 'border-white/15 text-zinc-400'
              : 'border-hairline text-ink-muted'
          }`}
        >
          Your Business
        </span>
      )}
    </span>
  );
}
