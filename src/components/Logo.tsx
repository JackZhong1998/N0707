/**
 * NowBuild 文字 Logo — NowBuild Your Business
 * N 与 B 使用品牌红，N 向左微倾（与 favicon 的斜 N 呼应）
 */
export default function Logo({
  dark = false,
  showTagline = true,
}: {
  dark?: boolean;
  showTagline?: boolean;
}) {
  const red = dark ? 'text-red-500' : 'text-red-600';
  const taglineColor = dark ? 'text-zinc-400' : 'text-zinc-500';
  return (
    <span className="inline-flex items-baseline select-none">
      <span
        className={`font-[family-name:var(--font-display)] text-lg font-bold tracking-tight ${
          dark ? 'text-white' : 'text-ink'
        }`}
      >
        <span className={`inline-block -rotate-8 font-extrabold ${red}`}>N</span>
        <span>ow</span>
        <span className={`font-extrabold ${red}`}>B</span>
        <span>uild</span>
      </span>
      {showTagline && (
        <span className={`ml-2 text-lg font-medium tracking-tight ${taglineColor}`}>
          Your Business
        </span>
      )}
    </span>
  );
}
