/**
 * NowBuild 文字 Logo
 * - “NowBuild” 两词合写，N 与 B 用不同灰阶区分
 * - “Your business” 作为小号副标题跟随其后
 */
export default function Logo({
  dark = false,
  showTagline = true,
}: {
  dark?: boolean;
  showTagline?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-2 select-none">
      <span
        className={`font-[family-name:var(--font-display)] text-lg font-bold tracking-tight ${
          dark ? 'text-white' : 'text-ink'
        }`}
      >
        <span className={dark ? 'text-white' : 'text-ink'}>N</span>
        <span>ow</span>
        <span className={dark ? 'text-zinc-500' : 'text-zinc-400'}>B</span>
        <span>uild</span>
      </span>
      {showTagline && (
        <span
          className={`hidden text-[11px] font-medium tracking-wide sm:inline ${
            dark ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          Your business
        </span>
      )}
    </span>
  );
}
