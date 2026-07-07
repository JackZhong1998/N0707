'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useGtm } from '@/lib/gtm/storage';

export default function OnboardingPage() {
  const router = useRouter();
  const locale = useLocale();
  const isZh = locale === 'zh';
  const { updateState } = useGtm();

  const [productUrl, setProductUrl] = useState('');
  const [thirtyDayGoal, setThirtyDayGoal] = useState('');
  const [hasProduct, setHasProduct] = useState<boolean | null>(null);
  const [willingDaily, setWillingDaily] = useState<boolean | null>(null);

  const canContinue =
    hasProduct !== null && willingDaily !== null && thirtyDayGoal.trim().length > 0;

  const handleContinue = () => {
    updateState({
      onboardingCompleted: true,
      phase: 'kickoff',
      kickoffForm: {
        productUrl: productUrl || undefined,
        thirtyDayGoal,
      },
    });
    router.push('/workspace/marketing');
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">
        {isZh ? '欢迎来到 NowBuild GTM 行动台' : 'Welcome to NowBuild GTM'}
      </h1>
      <p className="mt-2 text-gray-500">
        {isZh
          ? '这是帮你做 30 天获客的执行系统，不是创业大全套。先确认几个资格问题。'
          : 'A 30-day GTM execution system. Not a full startup toolkit. Quick qualification first.'}
      </p>

      <div className="mt-8 space-y-6">
        <Question
          label={isZh ? '你是否已有可展示的产品？' : 'Do you have a demo-ready product?'}
        >
          <YesNo value={hasProduct} onChange={setHasProduct} isZh={isZh} />
        </Question>

        {hasProduct === false && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {isZh
              ? '建议先做出可展示的产品再来。你也可以继续，但 Kickoff 会追问产品链接。'
              : 'We recommend having a demo first. You can continue, but Kickoff will ask for your URL.'}
          </div>
        )}

        <Question
          label={isZh ? '你愿意每天花 15-30 分钟执行推广吗？' : 'Willing to spend 15-30 min/day on GTM?'}
        >
          <YesNo value={willingDaily} onChange={setWillingDaily} isZh={isZh} />
        </Question>

        <Question label={isZh ? '产品链接（可选）' : 'Product URL (optional)'}>
          <input
            type="url"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </Question>

        <Question label={isZh ? '30 天目标' : '30-day goal'}>
          <input
            type="text"
            value={thirtyDayGoal}
            onChange={(e) => setThirtyDayGoal(e.target.value)}
            placeholder={isZh ? '如：获得 20 次有效咨询' : 'e.g. 20 meaningful conversations'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </Question>
      </div>

      <button
        type="button"
        disabled={!canContinue}
        onClick={handleContinue}
        className="mt-8 w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isZh ? '开始 GTM Kickoff' : 'Start GTM Kickoff'}
      </button>
    </div>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      {children}
    </div>
  );
}

function YesNo({
  value,
  onChange,
  isZh,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  isZh: boolean;
}) {
  return (
    <div className="flex gap-2">
      {[
        { val: true, label: isZh ? '是' : 'Yes' },
        { val: false, label: isZh ? '否' : 'No' },
      ].map((o) => (
        <button
          key={String(o.val)}
          type="button"
          onClick={() => onChange(o.val)}
          className={`rounded-lg border px-4 py-2 text-sm ${
            value === o.val
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
