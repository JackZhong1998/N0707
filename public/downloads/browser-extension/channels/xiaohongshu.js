let activeRequest = null;
const ADAPTER_VERSION = 'xhs-0.4.0';

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

function usable(element) {
  if (!visible(element)) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    Number(style.opacity || 1) > 0.1 &&
    style.pointerEvents !== 'none' &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\s\u200b]+/gu, ' ')
    .trim();
}

async function waitForValue(factory, errorMessage, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = factory();
    if (value) return value;
    await sleep(250);
  }
  throw new Error(errorMessage);
}

function clickElement(element) {
  element.scrollIntoView({ block: 'center', inline: 'center' });
  element.focus?.();
  element.click();
}

function exactTextElements(selector, text) {
  return [...document.querySelectorAll(selector)].filter(
    (element) => normalizeText(element.textContent) === text && usable(element)
  );
}

function findUploadImageTab() {
  return exactTextElements('.creator-tab', '上传图文')[0];
}

function findTextCoverButton() {
  return exactTextElements('button', '文字配图')[0];
}

function findCoverEditor() {
  return [...document.querySelectorAll('.tiptap.ProseMirror[contenteditable="true"]')]
    .filter(usable)
    .find((element) =>
      element.querySelector('[data-placeholder*="真诚分享"]')
    );
}

function findGenerateImageControl() {
  return [...document.querySelectorAll('.edit-text-button')]
    .filter(usable)
    .find((element) => !element.querySelector('.disabled'));
}

function findNextButton() {
  return exactTextElements('button', '下一步')[0];
}

function findTitleInput() {
  const candidates = [
    'input[placeholder*="标题"]',
    'textarea[placeholder*="标题"]',
  ];
  return candidates
    .map((selector) => [...document.querySelectorAll(selector)].find(visible))
    .find(Boolean);
}

function findBodyEditor() {
  const selectors = [
    '.tiptap.ProseMirror[contenteditable="true"]',
    'textarea[placeholder*="正文"]',
    '[contenteditable="true"][data-placeholder*="正文"]',
  ];
  return selectors
    .map((selector) => [...document.querySelectorAll(selector)].find(visible))
    .find(Boolean);
}

function setInputValue(element, value) {
  element.focus();
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function requestBrowserInsert(text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'NOWBUILD_NATIVE_INSERT_TEXT', text },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || '小红书原生文字输入失败'));
          return;
        }
        resolve();
      }
    );
  });
}

async function replaceRichText(element, text) {
  element.focus();
  const range = document.createRange();
  range.selectNodeContents(element);
  if (!normalizeText(element.innerText || element.textContent)) range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  await sleep(80);
  await requestBrowserInsert(text);
  await sleep(300);
  const actual = normalizeText(element.innerText || element.textContent);
  const expected = normalizeText(text);
  if (actual !== expected) {
    throw new Error(
      `小红书编辑器内容校验失败（期望 ${expected.length} 字符，实际 ${actual.length} 字符）`
    );
  }
}

function uniqueHashtags(values) {
  const seen = new Set();
  return (values || [])
    .map((tag) => String(tag || '').trim().replace(/^#/, ''))
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function coverTextFor(content) {
  const title = String(content.title || '').trim();
  if (title) return [...title].slice(0, 40).join('');
  const firstSentence = String(content.body || '').split(/[。！？.!?\n]/u)[0].trim();
  return [...firstSentence].slice(0, 40).join('') || '分享一个新发现';
}

async function openFinalEditor(content) {
  const uploadImageTab = await waitForValue(
    findUploadImageTab,
    '没有找到小红书“上传图文”入口'
  );
  clickElement(uploadImageTab);
  emit('filling', {
    message: '已切换到小红书上传图文',
    adapterVersion: ADAPTER_VERSION,
  });

  const textCoverButton = await waitForValue(
    findTextCoverButton,
    '没有找到小红书“文字配图”入口'
  );
  clickElement(textCoverButton);

  const coverEditor = await waitForValue(
    findCoverEditor,
    '等待小红书文字封面编辑器超时'
  );
  const coverText = coverTextFor(content);
  await replaceRichText(coverEditor, coverText);
  emit('generating_cover', {
    message: '正在生成小红书文字封面',
    coverText,
    adapterVersion: ADAPTER_VERSION,
  });

  const generateControl = await waitForValue(
    findGenerateImageControl,
    '小红书“生成图片”按钮没有启用'
  );
  clickElement(generateControl);

  const nextButton = await waitForValue(
    findNextButton,
    '等待小红书文字封面生成超时',
    60000
  );
  emit('cover_ready', {
    message: '小红书文字封面已生成，使用默认模板',
    adapterVersion: ADAPTER_VERSION,
  });
  clickElement(nextButton);

  return waitForValue(
    () => {
      const title = findTitleInput();
      const body = findBodyEditor();
      return title && body ? { title, body } : null;
    },
    '等待小红书最终发布编辑器超时',
    45000
  );
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
      adapterVersion: ADAPTER_VERSION,
    });
  }, 750);
}

async function start(request) {
  activeRequest = request;
  try {
    const content = request.content || {};
    const title = String(content.title || '').trim();
    if ([...title].length > 20) {
      throw new Error('小红书标题不能超过 20 个字符');
    }
    const hashtags = uniqueHashtags(content.hashtags)
      .map((tag) => `#${tag}`)
      .join(' ');
    const body = [String(content.body || '').trim(), hashtags]
      .filter(Boolean)
      .join('\n\n');
    if (!body) throw new Error('没有可以填写的小红书正文');
    if ([...body].length > 1000) {
      throw new Error('小红书正文和标签合计不能超过 1000 个字符');
    }

    const editors = await openFinalEditor(content);
    setInputValue(editors.title, title);
    if (editors.title.value !== title) {
      throw new Error('小红书标题没有完整填入');
    }
    await replaceRichText(editors.body, body);
    watchForPublish();
    emit('awaiting_user', {
      message: '文字封面、标题和正文已填入小红书，请检查后点击“发布”',
      adapterVersion: ADAPTER_VERSION,
    });
  } catch (error) {
    emit('failed', {
      error: error?.message || '无法填写小红书发布页面',
      adapterVersion: ADAPTER_VERSION,
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
      adapterVersion: ADAPTER_VERSION,
    });
  } catch (error) {
    emit('failed', {
      error: error?.message || '无法读取小红书笔记数据',
      adapterVersion: ADAPTER_VERSION,
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
