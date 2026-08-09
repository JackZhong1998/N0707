const baseUrl = process.env.AGENT_FLOW_BASE_URL || 'http://127.0.0.1:3011';

async function post(path, body) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} (${response.status}): ${JSON.stringify(payload)}`);
  }
  return { payload, durationMs: Date.now() - startedAt };
}

const projectProfileDoc = `# Product
NowBuild is a web app for solo SaaS founders who have built a product but do not know what marketing work to do next.

It turns a project document into a 30-day market strategy report, lets the founder choose channels, then generates one channel plan, publishable Todos, drafts, and revisions inside a partner chat.

# Current stage
The product is an MVP. Do not claim customers, revenue, conversion rates, or proven traction.

# Audience
English-speaking solo founders and very small SaaS teams preparing their first repeatable launch.

# Constraints
The founder can spend about five hours per week, prefers writing over video, has no established audience, and wants low-cost organic distribution. Pricing is not supplied.

# Differentiation
The system connects strategy, channel plans, daily deliverables, revisions, publishing status, and early performance data in one workflow.`;

const userProfileDoc = `The founder writes directly and prefers concise, practical explanations. They can publish text consistently but do not want a video-heavy plan. Never invent personal stories.`;

const timings = {};
const reportCall = await post('/api/agents/market-strategy-report', {
  launchId: 'agent-flow-eval-20260809',
  productName: 'NowBuild',
  projectProfileDoc,
  userProfileDoc,
  conversationDigest: 'The user wants an executable low-cost launch and wants to inspect Agent quality.',
  campaignContext: JSON.stringify({ selectedChannelIds: [], todoCount: 0 }),
  locale: 'en',
});
timings.marketReportMs = reportCall.durationMs;
const report = reportCall.payload.report;
const allowed = new Set([
  'xiaohongshu', 'user_outreach', 'website_copy', 'wechat_official',
  'product_hunt', 'twitter_x', 'linkedin', 'reddit', 'hacker_news',
  'indie_hackers', 'tiktok', 'youtube', 'instagram', 'seo',
  'github_growth',
]);
const selected =
  report.recommendations.find(
    (item) => item.priority === 'primary' && allowed.has(item.channelId) && !['seo'].includes(item.channelId)
  ) || report.recommendations.find((item) => allowed.has(item.channelId));
if (!selected) throw new Error('Market report returned no selectable channel');

const campaignContext = JSON.stringify({
  marketStrategy: {
    summary: report.summaryMarkdown,
    diagnosis: report.diagnosis,
    selectedRecommendation: selected,
  },
  selectedChannelIds: [selected.channelId],
});

const strategyCall = await post('/api/agents/strategy', {
  channelIds: [selected.channelId],
  projectProfileDoc,
  userProfileDoc,
  conversationDigest: 'The user selected this channel from the market strategy report.',
  existingOverview: report.reportMarkdown,
  campaignContext,
  locale: 'en',
  phase: 'channel',
});
timings.channelStrategyMs = strategyCall.durationMs;
const strategy = strategyCall.payload;
const channel = strategy.channels[0];
if (!channel) throw new Error('Channel strategy was empty');

const targetMarkets = [
  {
    id: 'market-us-founders',
    name: 'United States',
    region: 'North America',
    language: 'English',
    locale: 'en-US',
    audience: 'English-speaking solo SaaS founders preparing a first repeatable launch',
    isDefault: true,
  },
];
const todosCall = await post('/api/agents/channel-todos', {
  channelId: selected.channelId,
  channelStrategyMarkdown: channel.markdown,
  projectProfileDoc,
  userProfileDoc,
  campaignContext,
  targetMarkets,
  locale: 'en',
});
timings.todosMs = todosCall.durationMs;
const todos = todosCall.payload.todos || [];
if (todos.length === 0) throw new Error('Todo generation returned no Todos');
const todo = todos[0];

const writeCall = await post('/api/agents/channel-write', {
  todo: {
    id: 'agent-flow-todo-1',
    channelId: selected.channelId,
    ...todo,
  },
  channelStrategyMarkdown: channel.markdown,
  projectProfileDoc,
  userProfileDoc,
  campaignContext,
  locale: 'en',
  sessionId: `agent-flow:${selected.channelId}:todo-1`,
});
timings.firstDraftMs = writeCall.durationMs;
const draft = writeCall.payload;

const rewriteCall = await post('/api/agents/channel-chat', {
  todo: {
    id: 'agent-flow-todo-1',
    channelId: selected.channelId,
    ...todo,
  },
  currentContent: draft,
  history: [],
  message: 'Shorten the body by 30%. Keep the central point and CTA. Do not add any new facts.',
  channelStrategyMarkdown: channel.markdown,
  channelTodosDigest: todos.slice(0, 8).map((item) => `${item.dayIndex}: ${item.title}`).join('\n'),
  projectProfileDoc,
  userProfileDoc,
  campaignContext,
  locale: 'en',
  contentOnly: true,
  sessionId: `agent-flow:${selected.channelId}:todo-1`,
});
timings.rewriteMs = rewriteCall.durationMs;
const rewrite = rewriteCall.payload.rewriteContent;

const guidancePattern = /(?:find|join|participate|research|collect|verify|go comment|寻找|参与|调研|收集|核实).{0,35}(?:post|thread|discussion|帖子|讨论|反馈)/i;
const checks = {
  reportHasAllRecommendations: report.recommendations.length >= 10,
  directoryNotRecommended: !report.recommendations.some((item) => item.channelId === 'directory'),
  primaryChannelCount: report.recommendations.filter((item) => item.priority === 'primary').length,
  englishMarketSkipsChineseOnlyChannels: report.recommendations
    .filter((item) => ['xiaohongshu', 'wechat_official'].includes(item.channelId))
    .every((item) => item.priority === 'skip'),
  selectedChannel: selected.channelId,
  strategyOnlySelectedChannel:
    strategy.channels.length === 1 && strategy.channels[0].channelId === selected.channelId,
  noBlueprintInNewArtifacts: !/campaign blueprint|launch blueprint/i.test(
    `${report.reportMarkdown}\n${channel.markdown}\n${JSON.stringify(todos)}`
  ),
  todoCount: todos.length,
  todoDaysValid: todos.every((item) => item.dayIndex >= 1 && item.dayIndex <= 30),
  todoMarketsValid: todos.every(
    (item) => item.targetMarketId === 'market-us-founders' && item.outputLocale === 'en-US'
  ),
  noGuidanceTodos: todos.every(
    (item) => !guidancePattern.test(`${item.title} ${item.brief}`)
  ),
  draftResearchStatus: draft.research?.status,
  draftHasBody: typeof draft.body === 'string' && draft.body.length > 80,
  draftHasNoInventedCommercialTerms: !/(?:no credit card|cancel anytime|free trial|\d+[- ]day trial)/i.test(draft.body),
  draftHasNoInternalNotes: !/(?:notes for implementation|not part of published copy|internal checklist)/i.test(draft.body),
  rewriteReturned: Boolean(rewrite?.body),
  rewriteIsShorter: Boolean(rewrite?.body) && rewrite.body.length < draft.body.length,
  rewriteReusedResearchStatus: rewrite?.research?.status,
};

console.log(JSON.stringify({
  timings,
  checks,
  reportSample: report.reportMarkdown.slice(0, 1_500),
  selectedRecommendation: selected,
  channelStrategySample: channel.markdown.slice(0, 1_500),
  todoSamples: todos.slice(0, 4),
  firstDraft: { title: draft.title, body: draft.body, research: draft.research },
  rewrite: rewrite ? { title: rewrite.title, body: rewrite.body, research: rewrite.research } : null,
}, null, 2));
