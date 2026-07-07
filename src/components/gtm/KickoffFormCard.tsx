'use client';

import type { GtmKickoffForm } from '@/lib/gtm/types';

interface KickoffFormCardProps {
  form: GtmKickoffForm;
  onSubmit: (fields: Partial<GtmKickoffForm>) => void;
  locale: string;
}

const PRODUCT_TYPES = [
  { value: 'tool', zh: '工具', en: 'Tool' },
  { value: 'course', zh: '课程', en: 'Course' },
  { value: 'consulting', zh: '咨询', en: 'Consulting' },
  { value: 'community', zh: '社群', en: 'Community' },
  { value: 'other', zh: '其他', en: 'Other' },
];

const MARKETS = [
  { value: 'domestic', zh: '国内', en: 'Domestic' },
  { value: 'overseas', zh: '海外', en: 'Overseas' },
  { value: 'both', zh: '都要', en: 'Both' },
];

const ASSETS = [
  { value: 'landing', zh: '落地页', en: 'Landing page' },
  { value: 'xiaohongshu', zh: '小红书', en: 'Xiaohongshu' },
  { value: 'wechat', zh: '公众号', en: 'WeChat' },
  { value: 'x', zh: 'X / Twitter', en: 'X / Twitter' },
  { value: 'none', zh: '无', en: 'None' },
];

const TIME_BUDGETS = [
  { value: '15min', zh: '15 分钟', en: '15 min' },
  { value: '30min', zh: '30 分钟', en: '30 min' },
  { value: '1h', zh: '1 小时', en: '1 hour' },
];

const GOALS = [
  { value: '20_consultations', zh: '20 次咨询', en: '20 consultations' },
  { value: '100_uv', zh: '100 UV', en: '100 UV' },
  { value: '10_paid', zh: '10 个付费', en: '10 paid users' },
  { value: 'custom', zh: '自定义', en: 'Custom' },
];

export default function KickoffFormCard({ form, onSubmit, locale }: KickoffFormCardProps) {
  const isZh = locale === 'zh';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">
        {isZh ? '快填卡片（3 分钟）' : 'Quick form (3 min)'}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        {isZh ? '填完这些，策略顾问会更有针对性' : 'Fill these in for a better strategy'}
      </p>

      <div className="mt-4 space-y-4">
        <Field label={isZh ? '产品类型' : 'Product type'}>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_TYPES.map((o) => (
              <Chip
                key={o.value}
                selected={form.productType === o.value}
                onClick={() => onSubmit({ productType: o.value })}
                label={isZh ? o.zh : o.en}
              />
            ))}
          </div>
        </Field>

        <Field label={isZh ? '目标市场' : 'Target market'}>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((o) => (
              <Chip
                key={o.value}
                selected={form.targetMarket === o.value}
                onClick={() => onSubmit({ targetMarket: o.value })}
                label={isZh ? o.zh : o.en}
              />
            ))}
          </div>
        </Field>

        <Field label={isZh ? '现有资产' : 'Existing assets'}>
          <div className="flex flex-wrap gap-2">
            {ASSETS.map((o) => {
              const selected = form.existingAssets?.includes(o.value) ?? false;
              return (
                <Chip
                  key={o.value}
                  selected={selected}
                  onClick={() => {
                    const current = form.existingAssets ?? [];
                    const next = selected
                      ? current.filter((v) => v !== o.value)
                      : [...current, o.value];
                    onSubmit({ existingAssets: next });
                  }}
                  label={isZh ? o.zh : o.en}
                />
              );
            })}
          </div>
        </Field>

        <Field label={isZh ? '每日时间' : 'Daily time budget'}>
          <div className="flex flex-wrap gap-2">
            {TIME_BUDGETS.map((o) => (
              <Chip
                key={o.value}
                selected={form.dailyTimeBudget === o.value}
                onClick={() => onSubmit({ dailyTimeBudget: o.value })}
                label={isZh ? o.zh : o.en}
              />
            ))}
          </div>
        </Field>

        <Field label={isZh ? '产品链接' : 'Product URL'}>
          <input
            type="url"
            value={form.productUrl ?? ''}
            onChange={(e) => onSubmit({ productUrl: e.target.value })}
            placeholder="https://"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          />
        </Field>

        <Field label={isZh ? '30 天目标' : '30-day goal'}>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((o) => (
              <Chip
                key={o.value}
                selected={form.thirtyDayGoal === o.value}
                onClick={() => onSubmit({ thirtyDayGoal: o.value })}
                label={isZh ? o.zh : o.en}
              />
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
      }`}
    >
      {label}
    </button>
  );
}
