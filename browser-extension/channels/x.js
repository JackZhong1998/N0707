let activeRequest = null;

function emit(status, detail = {}) {
  if (!activeRequest) return;
  chrome.runtime.sendMessage({
    type: 'NOWBUILD_CHANNEL_EVENT',
    requestId: activeRequest.requestId,
    status,
    ...detail,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(selector, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

function insertText(element, text) {
  element.focus();
  document.execCommand('selectAll', false);
  document.execCommand('insertText', false, text);
  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text,
    })
  );
}

function findPublishedUrl(expectedText) {
  if (/\/status\/\d+/.test(window.location.pathname)) return window.location.href;
  const prefix = expectedText.trim().slice(0, 50);
  const posts = document.querySelectorAll('[data-testid="tweet"]');
  for (const post of posts) {
    if (prefix && !post.textContent?.includes(prefix)) continue;
    const link = post.querySelector('a[href*="/status/"]');
    if (link?.href) return link.href;
  }
  const toastLink = document.querySelector(
    '[data-testid="toast"] a[href*="/status/"], [role="alert"] a[href*="/status/"]'
  );
  return toastLink?.href || null;
}

function watchForPublish(expectedText) {
  const publishButtons =
    '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]';
  let publishClicked = false;
  document.addEventListener(
    'click',
    (event) => {
      if (event.target?.closest?.(publishButtons)) {
        publishClicked = true;
        emit('publishing', { message: '正在等待 X 确认发布结果' });
      }
    },
    true
  );

  const timer = window.setInterval(() => {
    if (!publishClicked) return;
    const url = findPublishedUrl(expectedText);
    if (!url) return;
    window.clearInterval(timer);
    emit('published', {
      message: 'X 帖子已发布',
      postUrl: url,
    });
  }, 750);
}

async function start(request) {
  activeRequest = request;
  try {
    const editor = await waitFor('[data-testid="tweetTextarea_0"]');
    const text = [request.content.title, request.content.body]
      .filter(Boolean)
      .join('\n\n');
    insertText(editor, text);
    watchForPublish(text);
    emit('awaiting_user', {
      message: '内容已填入 X，请检查后点击“发布”',
    });
  } catch (error) {
    emit('failed', {
      error: error?.message || '无法填写 X 发布页面',
    });
  }
}

function parseCount(value) {
  const text = String(value || '').trim().replace(/,/g, '');
  const match = text.match(/([\d.]+)\s*(万|千|[KMB])?/i);
  if (!match) return undefined;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return undefined;
  const unit = (match[2] || '').toUpperCase();
  if (unit === '万') return Math.round(number * 10000);
  if (unit === '千' || unit === 'K') return Math.round(number * 1000);
  if (unit === 'M') return Math.round(number * 1000000);
  if (unit === 'B') return Math.round(number * 1000000000);
  return Math.round(number);
}

function countFromElement(element) {
  if (!element) return undefined;
  const aria = element.getAttribute('aria-label') || '';
  return parseCount(aria) ?? parseCount(element.textContent);
}

async function collectMetrics(request) {
  activeRequest = request;
  try {
    const tweet = await waitFor('article[data-testid="tweet"]', 20000);
    const reply = tweet.querySelector('[data-testid="reply"]');
    const retweet = tweet.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
    const like = tweet.querySelector('[data-testid="like"], [data-testid="unlike"]');
    const bookmark = tweet.querySelector('[data-testid="bookmark"], [data-testid="removeBookmark"]');
    const analytics = tweet.querySelector(
      'a[href$="/analytics"], a[aria-label*="View"], a[aria-label*="view"]'
    );
    const metrics = {
      impressions: countFromElement(analytics),
      likes: countFromElement(like),
      comments: countFromElement(reply),
      shares: countFromElement(retweet),
      saves: countFromElement(bookmark),
    };
    if (Object.values(metrics).every((value) => value === undefined)) {
      throw new Error('没有在 X 帖子页找到可读取的数据');
    }
    emit('collected', {
      message: 'X 帖子数据已更新',
      metrics,
    });
  } catch (error) {
    emit('failed', {
      error: error?.message || '无法读取 X 帖子数据',
    });
  }
}

chrome.runtime.onMessage.addListener((request) => {
  if (request?.type === 'NOWBUILD_CHANNEL_START') void start(request);
  if (request?.type === 'NOWBUILD_METRICS_START') void collectMetrics(request);
});

chrome.runtime.sendMessage({
  type: 'NOWBUILD_CHANNEL_READY',
  channel: 'twitter_x',
});
