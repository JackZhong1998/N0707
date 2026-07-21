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

function isLoginWall() {
  const text = document.body?.innerText || '';
  const needsLogin =
    /登录后查看|请先登录|扫码登录|登录探索更多|马上登录/.test(text);
  return needsLogin && !findInteractionRoot() && !noteContentReady();
}

function metricFromElement(element) {
  if (!element) return undefined;
  const value =
    parseCount(element.getAttribute('aria-label')) ??
    parseCount(element.textContent);
  return value;
}

function metricFromRoot(root, selectors) {
  for (const selector of selectors) {
    const value = metricFromElement(root.querySelector(selector));
    if (value !== undefined) return value;
  }
  return undefined;
}

function metricFromAria(root, pattern) {
  for (const element of root.querySelectorAll('[aria-label]')) {
    const label = element.getAttribute('aria-label') || '';
    if (!pattern.test(label)) continue;
    const value = parseCount(label);
    if (value !== undefined) return value;
  }
  return undefined;
}

function findInteractionRoot() {
  const candidates = [
    '.buttons.engage-bar-style',
    '.engage-bar-container',
    '.interact-container',
    '.engage-bar',
    '#noteContainer',
    '.note-container',
    '.note-detail',
    '[class*="engage-bar-style"]',
    '[class*="interact-container"]',
  ];
  for (const selector of candidates) {
    const element = document.querySelector(selector);
    if (element && visible(element)) return element;
  }
  return null;
}

function noteContentReady() {
  const markers = ['#detail-title', '#noteContainer', '.note-content', '.note-scroller'];
  return markers.some((selector) => {
    const element = document.querySelector(selector);
    return element && visible(element);
  });
}

function readMetricCount(root, wrapperSelector) {
  const wrapper = root.querySelector(wrapperSelector);
  if (!wrapper || !visible(wrapper)) return undefined;
  const countEl = wrapper.querySelector('.count');
  if (countEl) {
    const value = metricFromElement(countEl);
    return value !== undefined ? value : 0;
  }
  const ariaValue = metricFromAria(wrapper, /(点赞|评论|收藏|分享|赞|条评论)/);
  return ariaValue !== undefined ? ariaValue : 0;
}

function collectMetricsFromDom() {
  const root = findInteractionRoot();
  if (root) {
    return {
      likes: readMetricCount(root, '.like-wrapper'),
      comments: readMetricCount(root, '.chat-wrapper'),
      saves: readMetricCount(root, '.collect-wrapper'),
      shares: readMetricCount(root, '.share-wrapper'),
      views: metricFromRoot(root, [
        '.read-count',
        '[class*="read-count"]',
        '[class*="view-count"]',
      ]),
    };
  }

  const fallbackRoot = document.querySelector('#noteContainer') || document;
  const metrics = {
    likes: metricFromRoot(fallbackRoot, [
      '.buttons.engage-bar-style .like-wrapper .count',
      '.engage-bar-container .like-wrapper .count',
      '.interact-container .like-wrapper .count',
      '.like-wrapper .count',
    ]),
    comments: metricFromRoot(fallbackRoot, [
      '.buttons.engage-bar-style .chat-wrapper .count',
      '.engage-bar-container .chat-wrapper .count',
      '.interact-container .chat-wrapper .count',
      '.chat-wrapper .count',
    ]),
    saves: metricFromRoot(fallbackRoot, [
      '.buttons.engage-bar-style .collect-wrapper .count',
      '.engage-bar-container .collect-wrapper .count',
      '.interact-container .collect-wrapper .count',
      '.collect-wrapper .count',
    ]),
    shares: metricFromRoot(fallbackRoot, [
      '.buttons.engage-bar-style .share-wrapper .count',
      '.engage-bar-container .share-wrapper .count',
      '.interact-container .share-wrapper .count',
      '.share-wrapper .count',
    ]),
    views: metricFromRoot(fallbackRoot, [
      '.read-count',
      '[class*="read-count"]',
      '[class*="view-count"]',
    ]),
  };
  if (metrics.likes === undefined) {
    metrics.likes = metricFromAria(fallbackRoot, /(点赞|赞)/);
  }
  if (metrics.comments === undefined) {
    metrics.comments = metricFromAria(fallbackRoot, /(评论|条评论)/);
  }
  if (metrics.saves === undefined) {
    metrics.saves = metricFromAria(fallbackRoot, /(收藏)/);
  }
  if (metrics.shares === undefined) {
    metrics.shares = metricFromAria(fallbackRoot, /(分享)/);
  }
  if (metrics.views === undefined) {
    metrics.views = metricFromAria(document, /(浏览|阅读)/);
  }
  return metrics;
}

async function waitForNotePage(timeout = 75000) {
  const interactionSelectors = [
    '.buttons.engage-bar-style',
    '.engage-bar-container',
    '.interact-container',
    '.engage-bar .like-wrapper',
    '.like-wrapper',
  ];
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (isLoginWall()) {
      throw new Error('请先在小红书网页端登录后再采集数据');
    }
    if (noteContentReady()) {
      for (const selector of interactionSelectors) {
        const element = document.querySelector(selector);
        if (element && visible(element)) return;
      }
    }
    await sleep(350);
  }
  if (noteContentReady() && findInteractionRoot()) return;
  if (isLoginWall()) {
    throw new Error('请先在小红书网页端登录后再采集数据');
  }
  if (noteContentReady()) return;
  throw new Error('等待小红书笔记页加载超时，请确认帖子链接有效');
}

async function collectMetrics(request) {
  activeRequest = request;
  try {
    await waitForNotePage();
    let metrics = collectMetricsFromDom();
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (Object.values(metrics).some((value) => value !== undefined)) break;
      await sleep(500);
      metrics = collectMetricsFromDom();
    }

    const root = findInteractionRoot();
    if (
      root &&
      Object.values(metrics).every((value) => value === undefined)
    ) {
      metrics = {
        likes: readMetricCount(root, '.like-wrapper'),
        comments: readMetricCount(root, '.chat-wrapper'),
        saves: readMetricCount(root, '.collect-wrapper'),
        shares: readMetricCount(root, '.share-wrapper'),
      };
    }

    if (Object.values(metrics).every((value) => value === undefined)) {
      throw new Error('没有在小红书笔记页找到可读取的数据');
    }

    const normalized = {};
    for (const [key, value] of Object.entries(metrics)) {
      if (value !== undefined) normalized[key] = value;
    }

    emit('collected', {
      message: '小红书笔记数据已更新',
      metrics: normalized,
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
