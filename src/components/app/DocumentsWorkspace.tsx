'use client';

/**
 * 文档列表 + 详情的共享数据与渲染。
 */

import type {
  AgentArtifactKind,
  GtmStore,
  ChannelRecommendationResponse,
} from '@/lib/gtm/types';
import ChannelLogo from '@/components/ChannelLogo';
import { Markdown } from '@/lib/gtm/markdown';

export type DocId =
  | 'project'
  | 'user'
  | 'recommendations'
  | `channel-${string}`
  | `artifact-${string}`;

export type DocListItem = {
  id: DocId;
  href: string;
  label: string;
  ready: boolean;
  summary: string;
  kind: 'project' | 'user' | 'recommendations' | 'channel' | 'artifact';
  channelId?: string;
  version?: number;
  artifactKind?: AgentArtifactKind;
};

function artifactKindLabel(kind: AgentArtifactKind, isZh: boolean): string {
  const map: Record<AgentArtifactKind, [string, string]> = {
    research_report: ['研究报告', 'Research report'],
    weekly_review: ['周复盘', 'Weekly review'],
    strategy_proposal: ['策略提案', 'Strategy proposal'],
    topic_plan: ['选题计划', 'Topic plan'],
    general: ['工作文档', 'Document'],
  };
  return isZh ? map[kind][0] : map[kind][1];
}

export function isValidDocId(value: string, docs: DocListItem[]): value is DocId {
  return docs.some((doc) => doc.id === value && doc.kind !== 'artifact');
}

export function buildDocumentList(store: GtmStore, isZh: boolean): DocListItem[] {
  const brief = store.launch?.brief;
  const recommendations = store.launch?.channelRecommendations;
  const strategies = Object.entries(store.channelStrategies);
  const artifacts = [...(store.artifacts ?? [])]
    .filter((item) => item.status !== 'archived')
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return [
    {
      id: 'project',
      href: '/app/documents/project',
      label: isZh ? '项目文档' : 'Project document',
      ready: Boolean(store.projectProfileDoc.trim() || brief),
      summary:
        store.projectProfileDoc
          .replace(/^#+\s*/gm, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120) ||
        brief?.sourceMarkdown
          ?.replace(/^#+\s*/gm, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120) ||
        (isZh ? 'Research 生成的产品事实基础' : 'Product facts from research'),
      kind: 'project',
      version: brief?.revision,
    },
    {
      id: 'user',
      href: '/app/documents/user',
      label: isZh ? '用户档案' : 'User profile',
      ready: Boolean(store.userProfileDoc.trim()),
      summary: isZh
        ? '对话中持续积累的偏好、约束与想法'
        : 'Preferences, constraints, and ideas accumulated from chat',
      kind: 'user',
    },
    {
      id: 'recommendations',
      href: '/app/documents/recommendations',
      label: isZh ? '30 天市场策略报告' : '30-Day Market Strategy Report',
      ready: Boolean(recommendations),
      summary:
        recommendations?.diagnosis.primaryMarket ||
        (isZh
          ? '产品启动判断、渠道排期与 Directory 提交计划'
          : 'Launch diagnosis, channel schedule, and directory submission plan'),
      kind: 'recommendations',
    },
    ...strategies.map(([channelId, doc]) => ({
      id: `channel-${channelId}` as DocId,
      href: `/app/documents/channel-${encodeURIComponent(channelId)}`,
      label: `${doc.channelName} · ${isZh ? '策略' : 'Strategy'}`,
      ready: true,
      summary: doc.markdown.slice(0, 120),
      kind: 'channel' as const,
      channelId,
    })),
    ...artifacts.map((artifact) => ({
      id: `artifact-${artifact.id}` as DocId,
      href: `/app/artifacts/${encodeURIComponent(artifact.id)}`,
      label: artifact.title,
      ready: true,
      summary:
        artifact.summary?.slice(0, 120) ||
        artifactKindLabel(artifact.kind, isZh),
      kind: 'artifact' as const,
      version: artifact.version,
      artifactKind: artifact.kind,
    })),
  ];
}

const proseClassName =
  'doc-prose doc-prose-invert max-w-none break-words !text-zinc-300 [&_a]:break-all [&_a]:text-sky-300 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-zinc-100 [&_pre]:overflow-x-auto [&_strong]:text-white';

export function MarkdownBody({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-sm text-zinc-500">—</p>;
  }
  return <Markdown text={text} className={proseClassName} />;
}

function ProjectDocBody({
  markdown,
}: {
  markdown: string;
}) {
  return <MarkdownBody text={markdown} />;
}

function RecommendationsBody({
  recommendations,
  isZh,
}: {
  recommendations: ChannelRecommendationResponse;
  isZh: boolean;
}) {
  return (
    <div className="min-w-0 space-y-5 break-words">
      <MarkdownBody
        text={
          recommendations.reportMarkdown || recommendations.summaryMarkdown
        }
      />
      <ul className="space-y-3">
        {recommendations.recommendations
          .filter((item) => item.priority !== 'skip')
          .map((item) => (
            <li
              key={item.channelId}
              className="rounded-2xl border border-white/[0.06] px-4 py-3"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ChannelLogo channelId={item.channelId} size={16} />
                {item.channelName}
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {item.priority}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-zinc-400">{item.rationale}</p>
            </li>
          ))}
      </ul>
      <p className="text-xs text-zinc-500">
        {isZh
          ? '报告中的 Directory 部分免费开放；付费后，Directory 工作区才会显示针对这个产品的具体平台排名并执行提交。'
          : 'The directory strategy is free in this report. Exact platform ranking and submission execution unlock in the paid Directory workspace.'}
      </p>
    </div>
  );
}

export function DocumentDetailBody({
  docId,
  store,
  isZh,
}: {
  docId: DocId;
  store: GtmStore;
  isZh: boolean;
}) {
  const brief = store.launch?.brief;
  const recommendations = store.launch?.channelRecommendations;

  if (docId === 'project') {
    const importedMarkdown =
      store.projectProfileDoc || brief?.sourceMarkdown || '';
    if (!importedMarkdown.trim()) {
      return (
        <p className="text-sm text-zinc-500">
          {isZh ? '项目文档尚未生成。' : 'Project document not ready yet.'}
        </p>
      );
    }
    return <ProjectDocBody markdown={importedMarkdown} />;
  }

  if (docId === 'user') {
    return (
      <MarkdownBody
        text={
          store.userProfileDoc ||
          (isZh
            ? '你在对话中补充的偏好、约束与想法会持续整理到这里。'
            : 'Preferences, constraints, and ideas you share in chat will be organized here.')
        }
      />
    );
  }

  if (docId === 'recommendations') {
    if (!recommendations) {
      return (
        <p className="text-sm text-zinc-500">
          {isZh
            ? '市场策略报告正在生成。'
            : 'Your market strategy report is being generated.'}
        </p>
      );
    }
    return <RecommendationsBody recommendations={recommendations} isZh={isZh} />;
  }

  if (docId.startsWith('channel-')) {
    const channelId = docId.replace('channel-', '');
    return (
      <MarkdownBody text={store.channelStrategies[channelId]?.markdown || ''} />
    );
  }

  return null;
}
