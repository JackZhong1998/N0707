let activeRequest = null;
const ADAPTER_VERSION = 'x-0.3.7';

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

function visible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
  );
}

async function waitForVisible(selectors, timeout = 20000) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const selector of list) {
      const element = [...document.querySelectorAll(selector)].find(visible);
      if (element) return element;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for visible ${list.join(', ')}`);
}

function selectEditorContents(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function placeCaretAtEnd(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function requestBrowserInsert(text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'NOWBUILD_X_INSERT_TEXT',
        text,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || 'Chrome 原生文字输入失败'));
          return;
        }
        resolve();
      }
    );
  });
}

async function insertText(element, text) {
  element.focus();
  const existing = normalizeEditorText(element.innerText || element.textContent);
  if (existing) {
    selectEditorContents(element);
  } else {
    placeCaretAtEnd(element);
  }
  await sleep(80);
  await requestBrowserInsert(String(text || ''));
}

function normalizeEditorText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\s\u200b]+/gu, ' ')
    .trim();
}

async function fillEditor(element, text) {
  const expected = normalizeEditorText(text);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await insertText(element, text);
    await sleep(350);
    const actual = normalizeEditorText(element.innerText || element.textContent);
    if (actual === expected) return;

    const anchorSize = Math.min(16, Math.max(6, Math.floor(expected.length / 4)));
    const middleStart = Math.max(0, Math.floor((expected.length - anchorSize) / 2));
    const anchors = [
      expected.slice(0, anchorSize),
      expected.slice(middleStart, middleStart + anchorSize),
      expected.slice(-anchorSize),
    ].filter(Boolean);
    const matchingAnchors = anchors.filter((anchor) => actual.includes(anchor)).length;
    const nearExpectedLength = actual.length >= expected.length * 0.9;
    const appearsDuplicated = actual.length > expected.length * 1.15;
    const clearlyIncomplete =
      !actual ||
      actual.length < expected.length * 0.6 ||
      (!nearExpectedLength && matchingAnchors === 0);
    if ((clearlyIncomplete || appearsDuplicated) && attempt === 0) continue;
    if (clearlyIncomplete || appearsDuplicated) {
      throw new Error(
        `X 编辑器没有接收完整内容（期望 ${expected.length} 字符，实际 ${actual.length} 字符）`
      );
    }
    emit('verification_warning', {
      message: `X 为编辑器增加了格式字符，已继续执行（期望 ${expected.length}，页面 ${actual.length}）`,
      expectedLength: expected.length,
      actualLength: actual.length,
      adapterVersion: ADAPTER_VERSION,
    });
    return;
  }
}

function composeContent(content) {
  const seenHashtags = new Set();
  const hashtags = (content.hashtags || [])
    .map((tag) => `#${String(tag).trim().replace(/^#/, '')}`)
    .filter((tag) => tag.length > 1)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (seenHashtags.has(key)) return false;
      seenHashtags.add(key);
      return true;
    })
    .join(' ');
  const text = [content.title, content.body]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');
  return { text, hashtags };
}

function threadParts(content, options) {
  const fullText = [content.text, content.hashtags].filter(Boolean).join('\n\n');
  if (options?.xAccountType === 'premium') return [fullText];
  if (!globalThis.NowBuildXText?.splitThreadContent) {
    throw new Error('X Thread splitter is unavailable');
  }
  return globalThis.NowBuildXText.splitThreadContent(
    content.text,
    content.hashtags,
    280
  );
}

function editorElements(root) {
  return [...root.querySelectorAll('[contenteditable="true"][data-testid^="tweetTextarea_"]')]
    .filter((element) => /^tweetTextarea_\d+$/.test(element.dataset.testid || ''))
    .filter(visible);
}

function composerRootFor(editor) {
  return editor.closest('[role="dialog"]') || editor.closest('main') || document;
}

async function waitForNewEditor(root, previousCount, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const editors = editorElements(root);
    if (editors.length > previousCount) {
      return editors[previousCount] || editors.at(-1);
    }
    await sleep(250);
  }
  throw new Error(`点击“添加帖子”后没有出现第 ${previousCount + 1} 个编辑框`);
}

async function addThreadEditor(root, previousCount) {
  const selectors = [
    '[data-testid="addButton"]',
    'button[aria-label="Add post"]',
    'button[aria-label="Add another post"]',
    'button[aria-label="添加帖子"]',
  ];
  let addButton = null;
  const started = Date.now();
  while (Date.now() - started < 10000) {
    addButton = selectors
      .flatMap((selector) => [...root.querySelectorAll(selector)])
      .find(
        (element) =>
          visible(element) &&
          !element.disabled &&
          element.getAttribute('aria-disabled') !== 'true'
      );
    if (addButton) break;
    await sleep(200);
  }
  if (!addButton) throw new Error('当前 X 发布弹窗中没有找到“添加帖子”按钮');
  addButton.focus();
  addButton.click();
  return waitForNewEditor(root, previousCount);
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
    const content = composeContent(request.content || {});
    const fullText = [content.text, content.hashtags].filter(Boolean).join('\n\n');
    if (!fullText) throw new Error('没有可以填写的 X 内容');
    const parts = threadParts(content, request.options || {});
    if (parts.length > 25) {
      throw new Error(`内容需要拆成 ${parts.length} 条，超过单个 Thread 的 25 条上限`);
    }

    let editor = await waitForVisible(
      '[role="dialog"] [contenteditable="true"][data-testid="tweetTextarea_0"]'
    );
    const composerRoot = composerRootFor(editor);
    for (let index = 0; index < parts.length; index += 1) {
      if (index > 0) editor = await addThreadEditor(composerRoot, index);
      await fillEditor(editor, parts[index]);
      emit('filling', {
        message:
          parts.length === 1
            ? 'X 内容已完整填入'
            : `正在填写 Thread：${index + 1} / ${parts.length}`,
        threadCount: parts.length,
        weightedLength: globalThis.NowBuildXText?.weightedLength(fullText),
        adapterVersion: ADAPTER_VERSION,
      });
    }

    watchForPublish(parts[0]);
    emit('awaiting_user', {
      message:
        parts.length === 1
          ? '内容已完整填入 X，请检查后点击“发布”'
          : `内容已拆成 ${parts.length} 条并填入 Thread，请检查后点击“发布全部”`,
      threadCount: parts.length,
      weightedLength: globalThis.NowBuildXText?.weightedLength(fullText),
      adapterVersion: ADAPTER_VERSION,
    });
  } catch (error) {
    emit('failed', {
      error: error?.message || '无法填写 X 发布页面',
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

function countFromElement(element) {
  if (!element) return undefined;
  const aria = element.getAttribute('aria-label') || '';
  return parseCount(aria) ?? parseCount(element.textContent);
}

function countFromLabel(label, names) {
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(
    `([\\d.,]+\\s*(?:万|千|[KMB])?)\\s*(?:${escaped.join('|')})`,
    'i'
  );
  const match = String(label || '').match(pattern);
  return match ? parseCount(match[1]) : undefined;
}

function metricGroupLabel(tweet) {
  const groups = [...tweet.querySelectorAll('[role="group"][aria-label]')];
  return groups
    .map((group) => group.getAttribute('aria-label') || '')
    .find((label) => /view|impression|like|repl|repost|bookmark|浏览|查看|展示|点赞|回复|评论|转发|收藏/i.test(label));
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
      'a[href*="/analytics"], [data-testid="analytics"], a[aria-label*="View"], a[aria-label*="view"], a[aria-label*="浏览"], a[aria-label*="查看"], a[aria-label*="展示"]'
    );
    const groupLabel = metricGroupLabel(tweet) || '';
    const reach =
      countFromElement(analytics) ??
      countFromLabel(groupLabel, ['views?', 'impressions?', '浏览', '查看', '展示']);
    const metrics = {
      impressions: reach,
      views: reach,
      likes:
        countFromElement(like) ?? countFromLabel(groupLabel, ['likes?', '点赞', '喜欢']),
      comments:
        countFromElement(reply) ??
        countFromLabel(groupLabel, ['replies', 'reply', '回复', '评论']),
      shares:
        countFromElement(retweet) ??
        countFromLabel(groupLabel, ['reposts?', 'retweets?', '转发']),
      saves:
        countFromElement(bookmark) ??
        countFromLabel(groupLabel, ['bookmarks?', '收藏', '书签']),
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
