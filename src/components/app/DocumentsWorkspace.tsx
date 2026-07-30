'use client';

/**
 * 文档列表 + 详情的共享数据与渲染。
 */

import type { GtmStore, LaunchBrief, ChannelRecommendationResponse } from '@/lib/gtm/types';
import ChannelLogo from '@/components/ChannelLogo';

export type DocId = 'project' | 'user' | 'recommendations' | `channel-${string}`;

export type DocListItem = {
  id: DocId;
  label: string;
  ready: boolean;
  summary: string;
  kind: 'project' | 'user' | 'recommendations' | 'channel';
  channelId?: string;
};

export function isValidDocId(value: string, docs: DocListItem[]): value is DocId {
  return docs.some((doc) => doc.id === value);
}

export function buildDocumentList(store: GtmStore, isZh: boolean): DocListItem[] {
  const brief = store.launch?.brief;
  const recommendations = store.launch?.channelRecommendations;
  const strategies = Object.entries(store.channelStrategies);

  return [
    {
      id: 'project',
      label: isZh ? '项目文档' : 'Project document',
      ready: Boolean(brief),
      summary:
        brief?.positioning.statement?.slice(0, 120) ||
        (isZh ? 'Research 生成的产品事实基础' : 'Product facts from research'),
      kind: 'project',
    },
    {
      id: 'user',
      label: isZh ? '用户档案' : 'User profile',
      ready: Boolean(store.userProfileDoc.trim()),
      summary: isZh
        ? '固定问卷 + 对话中持续拓展的偏好与想法'
        : 'Fixed questionnaire + expanding preferences from chat',
      kind: 'user',
    },
    {
      id: 'recommendations',
      label: isZh ? '渠道推荐' : 'Channel recommendations',
      ready: Boolean(recommendations),
      summary:
        recommendations?.diagnosis.primaryMarket ||
        (isZh
          ? '按产品与用户档案的优先级'
          : 'Priorities from product × profile fit'),
      kind: 'recommendations',
    },
    ...strategies.map(([channelId, doc]) => ({
      id: `channel-${channelId}` as DocId,
      label: `${doc.channelName} · ${isZh ? '策略' : 'Strategy'}`,
      ready: true,
      summary: doc.markdown.slice(0, 120),
      kind: 'channel' as const,
      channelId,
    })),
  ];
}

export function MarkdownBody({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-sm text-zinc-500">—</p>;
  }
  return (
    <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
      {text}
    </div>
  );
}

function ProjectDocBody({
  brief,
  projectProfileDoc,
  isZh,
}: {
  brief: LaunchBrief;
  projectProfileDoc: string;
  isZh: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {isZh ? '定位' : 'Positioning'}
        </p>
        <p className="mt-2 text-base text-zinc-200">{brief.positioning.statement}</p>
        <ul className="mt-3 space-y-1.5">
          {brief.positioning.sellingPoints.map((point) => (
            <li key={point} className="text-sm text-zinc-400">
              · {point}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {isZh ? '产品摘要' : 'Product summary'}
        </p>
        <p className="mt-2 text-sm text-zinc-300">{brief.product.summary}</p>
        <p className="mt-3 text-sm text-zinc-400">
          <span className="text-zinc-200">{isZh ? '核心问题：' : 'Problem: '}</span>
          {brief.product.problem}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {isZh ? '目标人群' : 'Audience'}
        </p>
        <p className="mt-2 text-sm text-zinc-300">{brief.audience.primary}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {isZh ? '竞品' : 'Competitors'}
        </p>
        <ul className="mt-2 space-y-1.5">
          {brief.competitors.map((item) => (
            <li key={item.name} className="text-sm text-zinc-400">
              <span className="text-zinc-200">{item.name}</span>
              {item.difference ? ` — ${item.difference}` : ''}
            </li>
          ))}
        </ul>
      </div>
      {projectProfileDoc ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {isZh ? '拓展档案' : 'Expanded profile'}
          </p>
          <div className="mt-2">
            <MarkdownBody text={projectProfileDoc} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecommendationsBody({
  recommendations,
  isZh,
}: {
  recommendations: ChannelRecommendationResponse;
  isZh: boolean;
}) {
  return (
    <div className="space-y-5">
      <MarkdownBody text={recommendations.summaryMarkdown} />
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
              <p className="mt-1.5 text-sm text-zinc-400">{item.rationale}</p>
            </li>
          ))}
      </ul>
      <p className="text-xs text-zinc-500">
        {isZh
          ? 'Directory 是固定能力，不在推荐列表中。请在左侧 Directory 提交。'
          : 'Directory is always on and omitted from recommendations. Submit via Directory.'}
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
    if (!brief) {
      return (
        <p className="text-sm text-zinc-500">
          {isZh ? '项目文档尚未生成。' : 'Project document not ready yet.'}
        </p>
      );
    }
    return (
      <ProjectDocBody
        brief={brief}
        projectProfileDoc={store.projectProfileDoc}
        isZh={isZh}
      />
    );
  }

  if (docId === 'user') {
    return (
      <MarkdownBody
        text={
          store.userProfileDoc ||
          (isZh
            ? '付费后完成固定问卷，之后对话中的偏好会持续补充到这里。'
            : 'Complete the post-pay questionnaire; chat preferences keep expanding here.')
        }
      />
    );
  }

  if (docId === 'recommendations') {
    if (!recommendations) {
      return (
        <p className="text-sm text-zinc-500">
          {isZh
            ? '完成用户档案后，合伙人会生成渠道推荐。'
            : 'After the profile card, Partner will generate channel recommendations.'}
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
