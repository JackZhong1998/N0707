const response = await fetch('http://127.0.0.1:3011/api/agents/channel-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    todo: {
      id: 'editor-eval-1',
      channelId: 'product_hunt',
      title: 'Draft: Product Hunt tagline and description',
      brief: 'Write a short Product Hunt tagline and description with a CTA to try the product.',
      dayIndex: 1,
      market: 'United States',
      targetMarketId: 'market-us-founders',
      outputLocale: 'en-US',
      audience: 'English-speaking solo SaaS founders',
    },
    currentContent: {
      title: 'NowBuild — Market strategy from your project doc',
      body: '**Tagline:**\nTurn your project doc into a 30-day market strategy\n\n**Description:**\nNowBuild turns your project document into a 30-day market strategy report. Choose channels, get publishable Todos, and revise them in one workflow. Try it now.',
      research: { status: 'skipped', searchedAt: Date.now(), queries: [], sources: [] },
    },
    history: [],
    message: 'Shorten the body by 30%. Keep the central point and CTA. Do not add new facts.',
    channelStrategyMarkdown: 'Use Product Hunt as a bounded launch test. Keep the copy concrete and honest.',
    channelTodosDigest: '',
    userProfileDoc: 'The founder prefers concise, direct English.',
    projectProfileDoc: 'NowBuild turns a project document into a 30-day market strategy report and publishable Todos. Pricing is unknown.',
    campaignContext: '{}',
    locale: 'en',
    contentOnly: true,
    sessionId: 'agent-flow:product_hunt:editor-eval-1',
  }),
});
const payload = await response.json();
if (!response.ok) throw new Error(JSON.stringify(payload));
const body = payload.rewriteContent?.body || '';
const hasCta = /(?:try it|get started|sign up|learn more|download|reply|comment|dm me)/i.test(body);
console.log(JSON.stringify({ hasCta, body, research: payload.rewriteContent?.research }, null, 2));
if (!hasCta) process.exitCode = 1;
