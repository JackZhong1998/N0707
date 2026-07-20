'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import type { AgentArtifact, AgentArtifactKind, AgentArtifactStatus } from '@/lib/gtm/types';

function DocStackIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l2 2v14H6V4h2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v2h8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6M9 15h4" />
    </svg>
  );
}

function kindLabel(kind: AgentArtifactKind, isZh: boolean): string {
  const map: Record<AgentArtifactKind, [string, string]> = {
    research_report: ['研究报告', 'Research report'],
    weekly_review: ['周复盘', 'Weekly review'],
    strategy_proposal: ['策略提案', 'Strategy proposal'],
    topic_plan: ['选题计划', 'Topic plan'],
    general: ['工作文档', 'Document'],
  };
  return isZh ? map[kind][0] : map[kind][1];
}

function statusDot(status: AgentArtifactStatus): string {
  if (status === 'waiting_approval') return 'bg-amber-300';
  if (status === 'applied') return 'bg-emerald-400';
  if (status === 'archived') return 'bg-zinc-500';
  return 'bg-sky-400';
}

type ArtifactLibraryDrawerProps = {
  open: boolean;
  onClose: () => void;
  artifacts: readonly AgentArtifact[];
  isZh?: boolean;
};

export function ArtifactLibraryTrigger({
  onClick,
  isZh = true,
}: {
  onClick: () => void;
  isZh?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-white"
      aria-label={isZh ? '查看已生成的长文档' : 'View generated documents'}
    >
      <DocStackIcon />
    </button>
  );
}

export default function ArtifactLibraryDrawer({
  open,
  onClose,
  artifacts,
  isZh = true,
}: ArtifactLibraryDrawerProps) {
  const sorted = useMemo(
    () => [...artifacts].sort((a, b) => b.updatedAt - a.updatedAt),
    [artifacts]
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-3 top-[52px] z-40 w-[280px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d0e11]/98 shadow-2xl backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={isZh ? '已生成长文档' : 'Generated documents'}
    >
      <div className="flex h-10 items-center gap-2 border-b border-white/[0.08] px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-white">
            {isZh ? '已生成长文档' : 'Generated documents'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.07] hover:text-white"
          aria-label={isZh ? '关闭' : 'Close'}
        >
          ×
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <DocStackIcon className="mx-auto h-6 w-6 text-zinc-600" />
          <p className="mt-2 text-xs font-medium text-zinc-300">
            {isZh ? '还没有生成长文档' : 'No documents yet'}
          </p>
        </div>
      ) : (
        <div className="thin-scrollbar max-h-[320px] overflow-y-auto">
          {sorted.map((artifact) => (
            <Link
              key={artifact.id}
              href={`/app/artifacts/${artifact.id}`}
              onClick={onClose}
              className="flex w-full flex-col gap-1 border-b border-white/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(artifact.status)}`} />
                <span className="truncate text-[9px] uppercase tracking-wider text-zinc-500">
                  {kindLabel(artifact.kind, isZh)}
                </span>
              </span>
              <span className="line-clamp-2 text-[11px] font-medium leading-snug text-zinc-100">
                {artifact.title}
              </span>
              <span className="text-[9px] text-zinc-600">
                {new Date(artifact.updatedAt).toLocaleDateString(
                  isZh ? 'zh-CN' : 'en-US',
                  { month: 'short', day: 'numeric' }
                )}
                {' · '}
                V{artifact.version}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
