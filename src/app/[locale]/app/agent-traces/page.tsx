'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';

type TraceRow = {
  id: string;
  user_id: string;
  model: string;
  provider?: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cache_write_tokens: number;
  duration_ms: number;
  agent_name?: string | null;
  operation?: string | null;
  trace_id?: string | null;
  system_chars: number;
  user_chars: number;
  message_count: number;
  json_attempt: number;
  model_attempt: number;
  trace_metadata?: Record<string, unknown> | null;
  billed_cost_usd: number | string;
  created_at: string;
};

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function duration(ms: number): string {
  return ms >= 1_000 ? `${(ms / 1_000).toFixed(1)}s` : `${ms}ms`;
}

export default function AgentTracesPage() {
  const isZh = useLocale() !== 'en';
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agents/traces?limit=150', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as {
          traces?: TraceRow[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || 'Trace loading failed');
        if (!cancelled) setRows(payload.traces ?? []);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const prompt = rows.reduce((sum, row) => sum + number(row.prompt_tokens), 0);
    const cached = rows.reduce((sum, row) => sum + number(row.cached_tokens), 0);
    return {
      calls: rows.length,
      users: new Set(rows.map((row) => row.user_id)).size,
      averageMs: rows.length
        ? Math.round(rows.reduce((sum, row) => sum + number(row.duration_ms), 0) / rows.length)
        : 0,
      cacheRate: prompt > 0 ? Math.round((cached / prompt) * 100) : 0,
      cost: rows.reduce((sum, row) => sum + number(row.billed_cost_usd), 0),
    };
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          Agent Trace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          {isZh ? 'Agent 调用记录' : 'Agent calls'}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          {isZh
            ? '查看每次模型调用加载了哪些 Skill、输入有多长、搜索用了多久，以及是否命中缓存。出于隐私考虑，这里不保存 Prompt 原文。'
            : 'Inspect loaded Skills, prompt size, search latency, and cache usage for every model call. Raw prompts are not stored.'}
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          [isZh ? '调用次数' : 'Calls', `${summary.calls} / ${summary.users} ${isZh ? '个用户' : 'users'}`],
          [isZh ? '平均模型耗时' : 'Average latency', duration(summary.averageMs)],
          [isZh ? '缓存 Token 占比' : 'Cached token rate', `${summary.cacheRate}%`],
          [isZh ? '记录内成本' : 'Recorded cost', `$${summary.cost.toFixed(4)}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{label}</p>
            <p className="mt-2 text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {loading && <p className="mt-8 text-sm text-zinc-500">{isZh ? '读取中…' : 'Loading…'}</p>}
      {error && <p className="mt-8 text-sm text-red-300">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="min-w-[1260px] w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-zinc-500">
              <tr>
                {[
                  isZh ? '时间 / Agent' : 'Time / Agent',
                  isZh ? '用户' : 'User',
                  isZh ? '动作' : 'Operation',
                  'Skill',
                  isZh ? '上下文' : 'Context',
                  isZh ? '模型耗时' : 'Latency',
                  isZh ? '搜索' : 'Search',
                  isZh ? '缓存' : 'Cache',
                  isZh ? '模型 / 成本' : 'Model / Cost',
                ].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {rows.map((row) => {
                const metadata = row.trace_metadata ?? {};
                const skills = Array.isArray(metadata.skillIds)
                  ? metadata.skillIds.filter((item): item is string => typeof item === 'string')
                  : [];
                const cached = number(row.cached_tokens);
                const prompt = number(row.prompt_tokens);
                const cacheRate = prompt > 0 ? Math.round((cached / prompt) * 100) : 0;
                const researchStatus = typeof metadata.researchStatus === 'string'
                  ? metadata.researchStatus
                  : typeof metadata.revisionResearchStatus === 'string'
                    ? metadata.revisionResearchStatus
                    : '—';
                const researchMs = number(
                  metadata.researchDurationMs ?? metadata.revisionResearchDurationMs
                );
                return (
                  <tr key={row.id} className="align-top text-zinc-300">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{row.agent_name || '—'}</p>
                      <p className="mt-1 text-zinc-600">{new Date(row.created_at).toLocaleString()}</p>
                    </td>
                    <td className="max-w-[180px] px-4 py-4">
                      <p className="break-all font-mono text-[11px] text-zinc-400">{row.user_id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{row.operation || '—'}</p>
                      {(row.json_attempt > 1 || row.model_attempt > 1) && (
                        <p className="mt-1 text-amber-300">
                          JSON {row.json_attempt} / Model {row.model_attempt}
                        </p>
                      )}
                    </td>
                    <td className="max-w-[250px] px-4 py-4">
                      {skills.length ? skills.map((skill) => (
                        <p key={skill} className="break-all text-zinc-400">{skill}</p>
                      )) : '—'}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      <p>System {number(row.system_chars).toLocaleString()} chars</p>
                      <p>User {number(row.user_chars).toLocaleString()} chars</p>
                      <p>{number(row.message_count)} messages</p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-white">{duration(number(row.duration_ms))}</td>
                    <td className="px-4 py-4 text-zinc-400">
                      <p>{researchStatus}</p>
                      {researchMs > 0 && <p>{duration(researchMs)}</p>}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      <p>{cached.toLocaleString()} tokens</p>
                      <p>{cacheRate}%</p>
                    </td>
                    <td className="max-w-[210px] px-4 py-4 text-zinc-400">
                      <p className="break-all">{row.model}</p>
                      <p>{row.provider || '—'}</p>
                      <p>${number(row.billed_cost_usd).toFixed(5)}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              {isZh ? '还没有调用记录。' : 'No calls recorded yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
