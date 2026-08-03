'use client';

import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type {
  DirectoryMaterialKey,
  DirectoryMaterialsCard,
} from '@/lib/gtm/types';

const SOURCE_LABELS = {
  detected: ['已自动检测', 'Detected'],
  ai_draft: ['AI 草稿', 'AI drafts'],
  user_required: ['需要你补充', 'Needs your input'],
} as const;

export default function DirectoryMaterialsCardView({
  card,
  isZh,
  onSubmit,
}: {
  card: DirectoryMaterialsCard;
  isZh: boolean;
  onSubmit: (values: Partial<Record<DirectoryMaterialKey, string>>) => void;
}) {
  const [values, setValues] = useState<Partial<Record<DirectoryMaterialKey, string>>>(() =>
    Object.fromEntries(card.fields.map((field) => [field.key, field.value]))
  );
  const [error, setError] = useState('');
  const groups = useMemo(
    () =>
      (['user_required', 'detected', 'ai_draft'] as const)
        .map((source) => ({
          source,
          fields: card.fields.filter((field) => field.source === source),
        }))
        .filter((group) => group.fields.length > 0),
    [card.fields]
  );

  if (card.savedAt) {
    return (
      <div className="mt-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
        <p className="text-xs font-semibold text-emerald-200">
          {isZh ? '资料已保存到 Launch Kit' : 'Materials saved to the Launch Kit'}
        </p>
        <Link href="/app/launch-kit" className="mt-2 inline-block text-[11px] text-zinc-400 hover:text-white">
          {isZh ? '查看或修改资料 →' : 'Review or edit materials →'}
        </Link>
      </div>
    );
  }

  const submit = () => {
    const missing = card.fields.filter(
      (field) => field.required && !String(values[field.key] ?? '').trim()
    );
    if (missing.length) {
      setError(
        isZh
          ? `请补充：${missing.map((field) => field.label).join('、')}`
          : `Please add: ${missing.map((field) => field.label).join(', ')}`
      );
      return;
    }
    setError('');
    onSubmit(values);
  };

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.1] bg-night-elevated">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <p className="text-sm font-semibold text-white">{card.title}</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-500">{card.description}</p>
      </div>
      <div className="max-h-[460px] space-y-4 overflow-y-auto p-4 thin-scrollbar">
        {groups.map((group) => (
          <section key={group.source}>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              {SOURCE_LABELS[group.source][isZh ? 0 : 1]}
            </p>
            <div className="space-y-2.5">
              {group.fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                    {field.label}
                    {field.required && <span className="text-amber-300">*</span>}
                  </span>
                  {field.input === 'textarea' ? (
                    <textarea
                      rows={field.key === 'longDescription' ? 5 : 3}
                      value={values[field.key] ?? ''}
                      onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2 text-[11px] leading-5 text-white outline-none focus:border-white/25"
                    />
                  ) : (
                    <input
                      type={field.input === 'list' ? 'text' : field.input}
                      value={values[field.key] ?? ''}
                      onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                      placeholder={field.input === 'list' ? (isZh ? '用逗号分隔' : 'Comma separated') : undefined}
                      className="mt-1.5 h-9 w-full rounded-xl border border-white/[0.08] bg-black/25 px-3 text-[11px] text-white outline-none placeholder:text-zinc-700 focus:border-white/25"
                    />
                  )}
                  {field.detail && <span className="mt-1 block text-[9px] text-zinc-600">{field.detail}</span>}
                </label>
              ))}
            </div>
          </section>
        ))}

        {(card.needsLogo || card.needsScreenshots) && (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3">
            <p className="text-[11px] text-amber-100">
              {isZh
                ? `还需要${card.needsLogo ? ' Logo' : ''}${card.needsLogo && card.needsScreenshots ? ' 和' : ''}${card.needsScreenshots ? ' 产品截图' : ''}。`
                : `${card.needsLogo ? 'A logo' : ''}${card.needsLogo && card.needsScreenshots ? ' and ' : ''}${card.needsScreenshots ? 'product screenshots' : ''} are still needed.`}
            </p>
            <Link href="/app/launch-kit" className="mt-2 inline-block text-[10px] font-semibold text-amber-200 hover:text-white">
              {isZh ? '前往上传图片 →' : 'Upload images →'}
            </Link>
          </div>
        )}
      </div>
      <div className="border-t border-white/[0.08] p-3">
        {error && <p className="mb-2 text-[10px] text-red-300">{error}</p>}
        <p className="mb-2 text-[9px] leading-4 text-zinc-600">
          {isZh ? '没有的社交账号可以留空；带 * 的是当前已选 Directory 必需。' : 'Leave unavailable social accounts blank. * means required by a selected directory.'}
        </p>
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-black hover:bg-zinc-200"
        >
          {isZh ? '确认并保存到资料库' : 'Confirm and save to library'}
        </button>
      </div>
    </div>
  );
}
