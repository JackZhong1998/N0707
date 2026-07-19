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

function visible(element) {
  return Boolean(
    element &&
      element.getBoundingClientRect().width &&
      element.getBoundingClientRect().height
  );
}

function findTitleInput() {
  const candidates = [
    'input[placeholder*="标题"]',
    'textarea[placeholder*="标题"]',
    'input[maxlength]',
  ];
  return candidates
    .map((selector) => [...document.querySelectorAll(selector)].find(visible))
    .find(Boolean);
}

function findBodyEditor() {
  const selectors = [
    'textarea[placeholder*="正文"]',
    'textarea[placeholder*="内容"]',
    '[contenteditable="true"][data-placeholder*="正文"]',
    '[contenteditable="true"]',
  ];
  return selectors
    .map((selector) => [...document.querySelectorAll(selector)].find(visible))
    .find(Boolean);
}

function setNativeValue(element, value) {
  element.focus();
  if (element.isContentEditable) {
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, value);
    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value })
    );
    return;
  }
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function waitForEditors(timeout = 120000) {
  const started = Date.now();
  let promptedForMedia = false;
  while (Date.now() - started < timeout) {
    const title = findTitleInput();
    const body = findBodyEditor();
    if (title && body && title !== body) return { title, body };
    if (!promptedForMedia && Date.now() - started > 4000) {
      promptedForMedia = true;
      emit('needs_user_action', {
        message: '请先在小红书选择图文并上传图片，NowBuild 会继续填写文字',
      });
    }
    await sleep(350);
  }
  throw new Error('等待小红书图文编辑器超时');
}

function findPublishedUrl() {
  if (/\/explore\/[a-zA-Z0-9]+/.test(window.location.pathname)) {
    return window.location.href;
  }
  const link = document.querySelector(
    'a[href*="xiaohongshu.com/explore/"], a[href*="/explore/"]'
  );
  return link?.href || null;
}

function watchForPublish() {
  let publishClicked = false;
  document.addEventListener(
    'click',
    (event) => {
      const button = event.target?.closest?.('button');
      if (button && /发布/.test(button.textContent || '')) {
        publishClicked = true;
        emit('publishing', { message: '正在等待小红书确认发布结果' });
      }
    },
    true
  );
  const timer = window.setInterval(() => {
    if (!publishClicked) return;
    const pageText = document.body?.innerText || '';
    const url = findPublishedUrl();
    if (!url && !/发布成功/.test(pageText)) return;
    if (!url) {
      emit('needs_user_action', {
        message: '小红书显示发布成功；请打开新笔记，NowBuild 会继续获取地址',
      });
      return;
    }
    window.clearInterval(timer);
    emit('published', {
      message: '小红书笔记已发布',
      postUrl: url,
    });
  }, 750);
}

async function start(request) {
  activeRequest = request;
  try {
    const editors = await waitForEditors();
    setNativeValue(editors.title, request.content.title || '');
    const hashtags = (request.content.hashtags || [])
      .map((tag) => `#${String(tag).replace(/^#/, '')}`)
      .join(' ');
    const body = [request.content.body || '', hashtags].filter(Boolean).join('\n\n');
    setNativeValue(editors.body, body);
    watchForPublish();
    emit('awaiting_user', {
      message: '文字已填入小红书，请检查后点击“发布”',
    });
  } catch (error) {
    emit('failed', {
      error: error?.message || '无法填写小红书发布页面',
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

function metricFromSelectors(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    const value =
      parseCount(element.getAttribute('aria-label')) ??
      parseCount(element.textContent);
    if (value !== undefined) return value;
  }
  return undefined;
}

async function collectMetrics(request) {
  activeRequest = request;
  try {
    const started = Date.now();
    while (Date.now() - started < 20000 && !document.body?.innerText) {
      await sleep(250);
    }
    const metrics = {
      likes: metricFromSelectors([
        '.like-wrapper .count',
        '[class*="like-wrapper"] [class*="count"]',
        '[class*="like"] [class*="count"]',
      ]),
      comments: metricFromSelectors([
        '.chat-wrapper .count',
        '[class*="comment"] [class*="count"]',
        '[class*="chat-wrapper"] [class*="count"]',
      ]),
      saves: metricFromSelectors([
        '.collect-wrapper .count',
        '[class*="collect-wrapper"] [class*="count"]',
        '[class*="collect"] [class*="count"]',
      ]),
      shares: metricFromSelectors([
        '.share-wrapper .count',
        '[class*="share-wrapper"] [class*="count"]',
      ]),
    };
    if (Object.values(metrics).every((value) => value === undefined)) {
      throw new Error('没有在小红书笔记页找到可读取的数据');
    }
    emit('collected', {
      message: '小红书笔记数据已更新',
      metrics,
    });
  } catch (error) {
    emit('failed', {
      error: error?.message || '无法读取小红书笔记数据',
    });
  }
}

chrome.runtime.onMessage.addListener((request) => {
  if (request?.type === 'NOWBUILD_CHANNEL_START') void start(request);
  if (request?.type === 'NOWBUILD_METRICS_START') void collectMetrics(request);
});

chrome.runtime.sendMessage({
  type: 'NOWBUILD_CHANNEL_READY',
  channel: 'xiaohongshu',
});
