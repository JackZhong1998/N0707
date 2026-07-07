'use client';

import { Link } from '@/i18n/navigation';
import type { DailyTask } from '@/lib/gtm/types';

const CHANNEL_COLORS: Record<string, { dot: string; badge: string }> = {
  xiaohongshu: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
  user_outreach: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  website_copy: { dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
  wechat_official: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700' },
  user_interview: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  product_hunt: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
  twitter_x: { dot: 'bg-gray-700', badge: 'bg-gray-100 text-gray-700' },
  linkedin: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700' },
};

const TASK_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  post: { zh: '发布内容', en: 'Publish' },
  story: { zh: '故事帖', en: 'Story' },
  article: { zh: '长文', en: 'Article' },
  thread: { zh: 'Thread', en: 'Thread' },
  moments: { zh: '朋友圈', en: 'Moments' },
  dm: { zh: '私信触达', en: 'DM' },
  followup: { zh: '跟进', en: 'Follow up' },
  engage: { zh: '互动运营', en: 'Engage' },
  prep: { zh: '准备工作', en: 'Prep' },
  optimize: { zh: '优化', en: 'Optimize' },
  research: { zh: '调研', en: 'Research' },
  interview: { zh: '访谈', en: 'Interview' },
  synthesis: { zh: '洞察汇总', en: 'Synthesis' },
  launch: { zh: 'Launch', en: 'Launch' },
};

interface TaskTimelineProps {
  tasks: DailyTask[];
  locale: string;
}

export default function TaskTimeline({ tasks, locale }: TaskTimelineProps) {
  const isZh = locale === 'zh';

  return (
    <ol className="relative space-y-0">
      {tasks.map((task, i) => {
        const colors = CHANNEL_COLORS[task.channelId] ?? {
          dot: 'bg-gray-400',
          badge: 'bg-gray-100 text-gray-600',
        };
        const typeLabel = TASK_TYPE_LABELS[task.taskType];
        const isDone = task.status === 'done';
        const isSkipped = task.status === 'skipped';
        const isLast = i === tasks.length - 1;

        return (
          <li key={task.id} className="relative flex gap-4 pb-4">
            {/* Timeline rail */}
            <div className="flex w-12 shrink-0 flex-col items-center">
              <span className="pt-0.5 text-[11px] font-medium tabular-nums text-gray-400">
                {task.scheduledTime ?? '--:--'}
              </span>
              <span
                className={`mt-1.5 h-2.5 w-2.5 rounded-full ${isDone ? 'bg-gray-900' : isSkipped ? 'bg-gray-300' : colors.dot}`}
              />
              {!isLast && <span className="mt-1 w-px flex-1 bg-gray-200" />}
            </div>

            {/* Card */}
            <Link
              href={`/workspace/marketing/tasks/${task.id}`}
              className={`group mb-1 flex-1 rounded-xl border p-4 transition-all ${
                isDone
                  ? 'border-gray-100 bg-gray-50/60'
                  : isSkipped
                    ? 'border-gray-100 bg-white opacity-60'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${colors.badge}`}>
                  {task.channelName}
                </span>
                {typeLabel && (
                  <span className="text-[11px] text-gray-400">
                    {isZh ? typeLabel.zh : typeLabel.en}
                  </span>
                )}
                {isDone && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {isZh ? '已发布' : 'Published'}
                  </span>
                )}
                {isSkipped && (
                  <span className="ml-auto text-[11px] text-gray-400">
                    {isZh ? '已跳过' : 'Skipped'}
                  </span>
                )}
              </div>

              <p
                className={`mt-2 text-sm font-medium leading-snug ${isDone || isSkipped ? 'text-gray-500' : 'text-gray-900'}`}
              >
                {task.brief}
              </p>

              {task.angle && !isDone && !isSkipped && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  <span className="font-medium text-gray-600">{isZh ? '角度：' : 'Angle: '}</span>
                  {task.angle}
                </p>
              )}

              {!isDone && !isSkipped && (
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-gray-900">
                  {task.deliverable
                    ? isZh
                      ? '内容已备好 · 去审核发布'
                      : 'Content ready · Review & publish'
                    : isZh
                      ? '打开任务 · AI 现场写稿'
                      : 'Open task · AI drafts on the spot'}
                  <svg
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
