'use client';

import { useEffect, useState } from 'react';
import type { GenerationProgress } from '@/lib/gtm/types';

interface GenerationProgressProps {
  progress: GenerationProgress;
  locale: string;
}

const STEPS_ZH = ['分析产品画像', '制定渠道策略', '排期 30 天任务', '预写前 3 天内容'];
const STEPS_EN = ['Analyzing product', 'Building channel strategies', 'Scheduling 30 days', 'Pre-writing Day 1-3 content'];

export default function GenerationProgressView({ progress, locale }: GenerationProgressProps) {
  const isZh = locale === 'zh';
  const steps = isZh ? STEPS_ZH : STEPS_EN;
  const [dots, setDots] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const activeStep = Math.min(progress.step, steps.length - 1);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
            <svg className="h-7 w-7 animate-pulse text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" strokeLinejoin="round" />
              <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-5 font-display text-xl font-bold text-gray-900">
            {isZh ? '正在生成你的 30 天作战计划' : 'Building your 30-day battle plan'}
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            {isZh ? '基于你的产品画像与实战方法论定制，约需 1-2 分钟' : 'Customized from your product profile · takes 1-2 min'}
          </p>
        </div>

        <ol className="mt-8 space-y-3">
          {steps.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <li
                key={step}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : done
                      ? 'border-gray-100 bg-gray-50 text-gray-500'
                      : 'border-gray-100 bg-white text-gray-300'
                }`}
              >
                {done ? (
                  <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-gray-200" />
                )}
                {step}
                {active && <span className="w-4 text-left">{dots}</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
