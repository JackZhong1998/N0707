export function getKickoffGreeting(productUrl: string | undefined, locale: string): string {
  const isZh = locale === 'zh';
  if (!productUrl) {
    return isZh
      ? '你好，我是你的 GTM 策略顾问。在制定 30 天获客计划前，我需要先真正了解你的产品。先发我你的产品链接，或者用一句话告诉我：这个产品给谁解决什么问题？'
      : "Hi, I'm your GTM strategy advisor. Before we plan your 30-day campaign, I need to truly understand your product. Share your product URL, or tell me in one sentence: what problem does it solve, and for whom?";
  }
  return isZh
    ? '你好，我是你的 GTM 策略顾问。我看到你的产品链接了。为了制定真正有针对性的策略（而不是通用模板），我会问你几个关键问题。第一个：用一句话说，这个产品给谁解决什么问题？'
    : "Hi, I'm your GTM strategy advisor. I see your product link. To build a strategy that actually fits (not a generic template), I'll ask a few key questions. First: in one sentence, what problem does your product solve, and for whom?";
}
