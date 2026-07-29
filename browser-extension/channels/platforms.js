const runtime = globalThis.NowBuildChannelRuntime;
let activeRequest = null;

const PLATFORM_ADAPTER_VERSION = 'multi-0.6.1';

const PLATFORM_BY_HOST = [
  ['news.ycombinator.com', 'hacker_news'],
  ['dev.to', 'devto'],
  ['reddit.com', 'reddit'],
  ['linkedin.com', 'linkedin'],
  ['medium.com', 'medium'],
  ['hashnode.com', 'hashnode'],
  ['hashnode.dev', 'hashnode'],
  ['indiehackers.com', 'indie_hackers'],
];

function currentChannel() {
  if (globalThis.NowBuildForcedChannel) return globalThis.NowBuildForcedChannel;
  const hostname = window.location.hostname.toLocaleLowerCase();
  return PLATFORM_BY_HOST.find(([host]) => hostname === host || hostname.endsWith(`.${host}`))?.[1];
}

const CHANNEL = currentChannel();

function emit(status, detail = {}) {
  if (!activeRequest) return;
  chrome.runtime.sendMessage({
    type: 'NOWBUILD_CHANNEL_EVENT',
    requestId: activeRequest.requestId,
    status,
    adapterVersion: `${CHANNEL}-${PLATFORM_ADAPTER_VERSION}`,
    ...detail,
  });
}

function contentOf(request) {
  const content = request.content || {};
  return {
    title: String(content.title || '').trim(),
    body: String(content.body || '').trim(),
    url: String(content.url || '').trim(),
    tags: runtime.uniqueTags(content.hashtags),
  };
}

function appendUrlAndTags(content, options = {}) {
  const parts = [content.body];
  if (options.url !== false && content.url) parts.push(content.url);
  if (options.tags !== false && content.tags.length) {
    parts.push(content.tags.map((tag) => `#${tag}`).join(' '));
  }
  return parts.filter(Boolean).join('\n\n');
}

function loginWall(platformName) {
  const text = runtime.normalizeText(document.body?.innerText);
  if (
    CHANNEL === 'indie_hackers' &&
    /create an indie hackers profile|join indie hackers/i.test(text)
  ) {
    const error = new Error(
      '请先完成 Indie Hackers 账号与 Profile 初始化；完成后插件会自动返回发布流程'
    );
    error.blocker = 'login_required';
    throw error;
  }
  const patterns = [
    /sign in|log in|login to|join .* to|continue with google/i,
    /登录|登入|请先登录|注册后/i,
  ];
  if (patterns.some((pattern) => pattern.test(text))) {
    const error = new Error(
      `请先在 ${platformName} 网页端完成登录；登录成功后插件会自动续接刚才的任务`
    );
    error.blocker = 'login_required';
    throw error;
  }
}

async function waitForEditor(factory, platformName, timeout = 30000) {
  try {
    loginWall(platformName);
    return await runtime.waitFor(factory, `等待 ${platformName} 发布编辑器超时`, timeout);
  } catch (error) {
    loginWall(platformName);
    throw error;
  }
}

async function fillHackerNews(request) {
  const content = contentOf(request);
  if (!content.title) throw new Error('Hacker News 必须填写标题');
  const fields = await waitForEditor(() => {
    const title = runtime.firstVisible(['input[name="title"]']);
    if (!title) return null;
    return {
      title,
      url: runtime.firstVisible(['input[name="url"]']),
      text: runtime.firstVisible(['textarea[name="text"]']),
    };
  }, 'Hacker News');

  await runtime.fill(fields.title, content.title, { label: 'Hacker News 标题' });
  if (content.url && fields.url) {
    await runtime.fill(fields.url, content.url, { label: 'Hacker News URL' });
    emit('filling', { message: '已填写标题和产品 URL；HN 的 URL 投稿不会同时填写正文' });
  } else {
    const text = [content.body, content.tags.map((tag) => `#${tag}`).join(' ')]
      .filter(Boolean)
      .join('\n\n');
    if (!text || !fields.text) throw new Error('Hacker News 需要产品 URL 或正文');
    await runtime.fill(fields.text, text, { label: 'Hacker News 正文' });
  }
}

async function fillDevto(request) {
  const content = contentOf(request);
  if (!content.title || !content.body) throw new Error('DEV 必须填写标题和正文');
  const editors = await waitForEditor(() => {
    const title = runtime.firstVisible([
      'textarea[name="title"]',
      'input[name="title"]',
      'textarea[placeholder*="title" i]',
      'input[placeholder*="title" i]',
    ]);
    const body = runtime.firstVisible([
      'textarea[name="body_markdown"]',
      '#article_body_markdown',
      'textarea[placeholder*="body" i]',
      '[contenteditable="true"].ProseMirror',
    ]);
    return title && body ? { title, body } : null;
  }, 'DEV Community');

  await runtime.fill(editors.title, content.title, { label: 'DEV 标题' });
  await runtime.fill(editors.body, appendUrlAndTags(content, { tags: false }), {
    label: 'DEV 正文',
  });

  const tagInput = runtime.firstVisible([
    'input[name="tag_list"]',
    'input[placeholder*="tag" i]',
    '#tag-input',
  ]);
  const tags = runtime.uniqueTags(content.tags, 4);
  if (tagInput && tags.length) {
    let tokenMode = true;
    for (const tag of tags) {
      runtime.setInputValue(tagInput, tag);
      tagInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true,
      }));
      tagInput.dispatchEvent(new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        bubbles: true,
      }));
      await runtime.sleep(180);
      if (tagInput.value) {
        tokenMode = false;
        break;
      }
    }
    if (!tokenMode) {
      await runtime.fill(tagInput, tags.join(', '), { label: 'DEV 标签' });
    }
  }
}

async function fillReddit(request) {
  const content = contentOf(request);
  if (!content.title || !content.body) throw new Error('Reddit 必须填写标题和正文');
  let editors;
  try {
    editors = await waitForEditor(() => {
      const title = runtime.firstVisible([
        'textarea[name="title"]',
        'input[name="title"]',
        'textarea[placeholder*="title" i]',
        'input[placeholder*="title" i]',
        '[data-testid="post-title-textarea"]',
      ]);
      const body = runtime.firstVisible([
        'textarea[name="text"]',
        'textarea[placeholder*="body" i]',
        '[contenteditable="true"][role="textbox"]',
        '.ProseMirror[contenteditable="true"]',
      ]);
      return title && body ? { title, body } : null;
    }, 'Reddit', 18000);
  } catch (error) {
    const chooseCommunity = runtime.byText(
      ['button', '[role="button"]', 'span'],
      /choose a community|select a community|选择社区|选择社群/i
    );
    if (chooseCommunity) {
      const error = new Error(
        '请先在 Reddit 页面选择一个允许发帖的社区；完成后返回 NowBuild，再点击一次“准备发布”'
      );
      error.blocker = 'community_required';
      throw error;
    }
    throw error;
  }

  await runtime.fill(editors.title, content.title, { label: 'Reddit 标题' });
  await runtime.fill(editors.body, appendUrlAndTags(content, { tags: false }), {
    label: 'Reddit 正文',
  });
}

async function openLinkedInComposer() {
  let editor = runtime.firstVisible([
    '[contenteditable="true"][role="textbox"]',
    '.ql-editor[contenteditable="true"]',
  ]);
  if (editor) return editor;
  const opener = runtime.byText(
    ['button', '[role="button"]'],
    /start a post|create a post|发起帖子|创建帖子|分享动态/i
  );
  if (opener) runtime.click(opener);
  editor = await waitForEditor(
    () => runtime.firstVisible([
      '[contenteditable="true"][role="textbox"]',
      '.ql-editor[contenteditable="true"]',
    ]),
    'LinkedIn'
  );
  return editor;
}

async function fillLinkedIn(request) {
  const content = contentOf(request);
  const text = appendUrlAndTags({
    ...content,
    body: [content.title, content.body].filter(Boolean).join('\n\n'),
  });
  if (!text) throw new Error('没有可以填写的 LinkedIn 内容');
  if ([...text].length > 3000) throw new Error('LinkedIn 内容不能超过 3000 个字符');
  const editor = await openLinkedInComposer();
  await runtime.fill(editor, text, { label: 'LinkedIn 编辑器' });
}

function visibleRichEditors() {
  return runtime.queryAll('[contenteditable="true"]')
    .filter(runtime.visible)
    .filter((element) => !element.closest('[aria-hidden="true"]'));
}

async function fillMedium(request) {
  const content = contentOf(request);
  if (!content.title || !content.body) throw new Error('Medium 必须填写标题和正文');
  const editors = await waitForEditor(() => {
    const title = runtime.firstVisible([
      '[data-testid="editorTitleParagraph"]',
      'h1[contenteditable="true"]',
      'h3[contenteditable="true"]',
      '[contenteditable="true"][data-placeholder*="Title" i]',
    ]);
    const all = visibleRichEditors();
    const body = runtime.firstVisible([
      '[data-testid="editorParagraph"]',
      'p[contenteditable="true"]',
      '[contenteditable="true"][data-placeholder*="story" i]',
      '.ProseMirror[contenteditable="true"]',
    ]) || all.find((element) => element !== title);
    return title && body && title !== body ? { title, body } : null;
  }, 'Medium', 45000);

  await runtime.fill(editors.title, content.title, { label: 'Medium 标题' });
  await runtime.fill(editors.body, appendUrlAndTags(content, { tags: false }), {
    label: 'Medium 正文',
  });
}

async function fillHashnode(request) {
  const content = contentOf(request);
  if (!content.title || !content.body) throw new Error('Hashnode 必须填写标题和正文');
  if (!/^\/draft\/[^/]+/i.test(window.location.pathname)) {
    loginWall('Hashnode');
    const writeButton = runtime.byText(
      ['button', '[role="button"]'],
      /^write$/i
    );
    if (!writeButton) {
      throw new Error('Hashnode 已打开，但没有识别到 Write 按钮');
    }
    emit('navigating', {
      message: '正在通过 Hashnode 的 Write 按钮创建新草稿',
    });
    await runtime.sleep(150);
    runtime.click(writeButton);
    return { navigating: true };
  }

  const editors = await waitForEditor(() => {
    const title = runtime.firstVisible([
      'textarea[placeholder*="title" i]',
      'input[placeholder*="title" i]',
      '[data-testid*="title" i] textarea',
      '[contenteditable="true"][data-placeholder*="title" i]',
    ]);
    const body = runtime.firstVisible([
      '.ProseMirror[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="article" i]',
      'textarea[placeholder*="content" i]',
    ]);
    return title && body && title !== body ? { title, body } : null;
  }, 'Hashnode', 45000);

  await runtime.fill(editors.title, content.title, { label: 'Hashnode 标题' });
  await runtime.fill(editors.body, appendUrlAndTags(content, { tags: false }), {
    label: 'Hashnode 正文',
  });
}

async function fillIndieHackers(request) {
  const content = contentOf(request);
  if (!content.title || !content.body) throw new Error('Indie Hackers 必须填写标题和正文');
  const pageText = runtime.normalizeText(document.body?.innerText);
  if (/you can'?t create posts yet|unlock special privileges/i.test(pageText)) {
    const error = new Error(
      '当前 Indie Hackers 账号还没有创建帖子的权限；需要先通过社区贡献获得权限，或开通 Indie Hackers Plus'
    );
    error.blocker = 'account_posting_permission';
    throw error;
  }
  const editors = await waitForEditor(() => {
    const title = runtime.firstVisible([
      'input[name="title"]',
      'textarea[name="title"]',
      'input[placeholder*="title" i]',
      'textarea[placeholder*="title" i]',
    ]);
    const body = runtime.firstVisible([
      'textarea[name="body"]',
      'textarea[placeholder*="post" i]',
      '.ProseMirror[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
    ]);
    return title && body ? { title, body } : null;
  }, 'Indie Hackers', 40000);

  await runtime.fill(editors.title, content.title, { label: 'Indie Hackers 标题' });
  await runtime.fill(editors.body, appendUrlAndTags(content), {
    label: 'Indie Hackers 正文',
  });
}

const FILLERS = {
  hacker_news: fillHackerNews,
  devto: fillDevto,
  reddit: fillReddit,
  linkedin: fillLinkedIn,
  medium: fillMedium,
  hashnode: fillHashnode,
  indie_hackers: fillIndieHackers,
};

const FINAL_ACTION_PATTERN = {
  hacker_news: /^(submit)$/i,
  devto: /^(publish|publish post)$/i,
  reddit: /^(post|发布)$/i,
  linkedin: /^(post|发布)$/i,
  medium: /^(publish now|publish)$/i,
  hashnode: /^(publish|publish article)$/i,
  indie_hackers: /^(post|publish)$/i,
};

function isEditorUrl(channel, urlString) {
  const url = new URL(urlString);
  if (channel === 'hacker_news') return url.pathname === '/submit';
  if (channel === 'devto') return url.pathname === '/new';
  if (channel === 'reddit') return /\/submit\/?$/.test(url.pathname);
  if (channel === 'linkedin') return url.pathname === '/feed/' || url.pathname === '/feed';
  if (channel === 'medium') return /new-story|\/p\/[^/]+\/edit/.test(url.pathname);
  if (channel === 'hashnode') return /draft|editor/.test(url.pathname);
  if (channel === 'indie_hackers') return url.pathname === '/new-post';
  return false;
}

function watchForPublish() {
  const pattern = FINAL_ACTION_PATTERN[CHANNEL];
  let clickedAt = 0;
  document.addEventListener('click', (event) => {
    const control = event.target?.closest?.('button, input[type="submit"], [role="button"]');
    if (!control) return;
    const label = runtime.normalizeText(control.value || control.textContent || control.getAttribute('aria-label'));
    if (!pattern?.test(label)) return;
    clickedAt = Date.now();
    emit('publishing', { message: '检测到最终发布操作，正在等待平台返回结果' });
  }, true);

  const timer = window.setInterval(() => {
    if (!clickedAt || Date.now() - clickedAt < 600) return;
    const postUrl = findPublishedUrl();
    if (!postUrl && isEditorUrl(CHANNEL, window.location.href)) return;
    window.clearInterval(timer);
    const detected = postUrl ? validatePublishedUrl(CHANNEL, postUrl) : null;
    emit('published', {
      message: detected
        ? '平台已确认发布，并识别到公开帖子地址；即将返回 NowBuild'
        : '平台已确认发布，但当前页面不是可验证的原帖详情页；请返回 NowBuild 后补充链接',
      postUrl: detected || undefined,
      postUrlConfidence: detected ? 'high' : 'low',
    });
  }, 700);
}

function findPublishedUrl() {
  if (!isEditorUrl(CHANNEL, window.location.href)) {
    return validatePublishedUrl(CHANNEL, window.location.href);
  }
  const selectors = {
    linkedin: [
      '[role="alert"] a[href*="/feed/update/urn:li:activity:"]',
      'article a[href*="/feed/update/urn:li:activity:"]',
      'article a[href*="/posts/"]',
    ],
    devto: ['[role="alert"] a[href]', 'article a[href]'],
    reddit: ['[role="alert"] a[href*="/comments/"]', 'article a[href*="/comments/"]'],
    medium: ['[role="alert"] a[href*="/p/"]:not([href*="/edit"])'],
    hashnode: ['[role="alert"] a[href]', 'article a[data-testid*="article"]'],
    indie_hackers: ['[role="alert"] a[href*="/post/"]', 'article a[href*="/post/"]'],
  };
  const expectedPrefix = runtime
    .normalizeText(activeRequest?.content?.title || activeRequest?.content?.body)
    .slice(0, 42);
  for (const selector of selectors[CHANNEL] || []) {
    const href = runtime.queryAll(selector)
      .filter((link) => {
        if (!expectedPrefix) return true;
        const context = link.closest('article, [role="alert"], [role="status"]');
        return runtime.normalizeText(context?.textContent).includes(expectedPrefix);
      })
      .map((link) => link.href)
      .find((url) => url && validatePublishedUrl(CHANNEL, url));
    if (href) return href;
  }
  return null;
}

function validatePublishedUrl(channel, urlString) {
  try {
    const url = new URL(urlString);
    const path = `${url.pathname}${url.search}`;
    const rules = {
      hacker_news: /^\/item\?id=\d+$/i,
      devto: /^\/[^/]+\/[^/]+-[a-z0-9]+(?:\/|$)/i,
      reddit: /^(?:\/r\/[^/]+)?\/comments\/[a-z0-9]+(?:\/|$)/i,
      linkedin: /^(?:\/feed\/update\/urn:li:(?:activity|share):\d+|\/posts\/[^/]+)(?:\/|$)/i,
      medium: /^(?:\/@[^/]+\/[^/]+-[a-f0-9]+|\/[^/]+\/[^/]+-[a-f0-9]+|\/p\/[a-f0-9]+)(?:\/|$)/i,
      hashnode: /^(?!\/(?:feed|draft|editor|dashboard)(?:\/|$))\/[^/]+(?:\/|$)/i,
      indie_hackers: /^\/post\/[^/]+(?:\/|$)/i,
    };
    return rules[channel]?.test(path) ? url.href : null;
  } catch {
    return null;
  }
}

async function start(request) {
  activeRequest = request;
  try {
    const filler = FILLERS[CHANNEL];
    if (!filler) throw new Error('当前页面没有匹配的发布适配器');
    emit('filling', { message: `正在执行 ${CHANNEL} 页面规则` });
    const result = await filler(request);
    if (result?.navigating) return;
    watchForPublish();
    emit('awaiting_user', {
      message: '内容已填写并通过页面校验，请检查后决定是否手动发布',
    });
  } catch (error) {
    if (error?.blocker) {
      emit('blocked', {
        message: error.message,
        blocker: error.blocker,
      });
      return;
    }
    emit('failed', { error: error?.message || '平台发布页填写失败' });
  }
}

function metricsFromSelectors(map) {
  const result = {};
  const valueAttributes = {
    points: ['score', 'data-score'],
    comments: ['comment-count', 'data-comment-count', 'data-comments-count'],
    reactions: ['data-reaction-count', 'data-reactions-count'],
    views: ['view-count', 'data-view-count'],
    shares: ['share-count', 'data-share-count'],
  };
  for (const [key, selectors] of Object.entries(map)) {
    for (const selector of selectors) {
      const element = runtime.queryAll(selector).find(runtime.visible);
      if (!element) continue;
      let value;
      for (const attribute of valueAttributes[key] || []) {
        value = runtime.parseCount(element.getAttribute(attribute));
        if (value !== undefined) break;
      }
      value ??=
        runtime.parseCount(element.getAttribute('aria-label')) ??
        runtime.parseCount(element.getAttribute('title')) ??
        runtime.parseCount(element.textContent);
      if (value !== undefined) {
        result[key] = value;
        break;
      }
    }
  }
  return result;
}

function collectHackerNewsMetrics() {
  const score = document.querySelector('.score');
  const subtext = document.querySelector('.subtext');
  const commentsLink = [...(subtext?.querySelectorAll('a') || [])].find((link) => /comment/i.test(link.textContent));
  return {
    likes: runtime.parseCount(score?.textContent),
    comments: runtime.parseCount(commentsLink?.textContent) ?? 0,
  };
}

function collectHashnodeMetrics() {
  const result = metricsFromSelectors({
    reactions: [
      '[aria-label*="reaction" i]',
      '[data-testid*="reaction" i]',
      '[aria-label*="upvote" i]',
    ],
    comments: [
      '[aria-label*="comment" i]',
      '[data-testid*="comment" i]',
    ],
    views: [
      '[aria-label*="view" i]',
      '[data-testid*="view" i]',
    ],
  });
  const pageText = runtime.normalizeText(document.body?.innerText);
  const commentsMatch = pageText.match(/\bcomments?\s*\(([\d,.]+)\)/i);
  if (result.comments === undefined && commentsMatch) {
    result.comments = runtime.parseCount(commentsMatch[1]);
  }
  if (result.likes === undefined && result.reactions !== undefined) {
    result.likes = result.reactions;
    delete result.reactions;
  }
  return result;
}

function collectIndieHackersMetrics() {
  const result = {};
  const footer = document.querySelector('.post-page__footer-ssi-actions');
  const footerText = runtime.normalizeText(footer?.textContent);
  const votesMatch = footerText.match(/([\d,.]+)\s+upvotes?/i);
  const bookmarksMatch = footerText.match(/([\d,.]+)\s+bookmarks?/i);
  if (votesMatch) result.likes = runtime.parseCount(votesMatch[1]);
  if (bookmarksMatch) result.saves = runtime.parseCount(bookmarksMatch[1]);

  const comments = document.querySelectorAll('.comment').length;
  if (comments || /leave a comment|post comment/i.test(document.body?.innerText || '')) {
    result.comments = comments;
  }
  return result;
}

function collectPlatformMetrics() {
  if (CHANNEL === 'hacker_news') return collectHackerNewsMetrics();
  if (CHANNEL === 'hashnode') return collectHashnodeMetrics();
  if (CHANNEL === 'indie_hackers') return collectIndieHackersMetrics();
  const selectorMaps = {
    devto: {
      reactions: ['#reaction-butt-react-button', '[data-reaction-count]', '[aria-label*="reaction" i]'],
      comments: ['#comments .comments-count', 'a[href$="#comments"]', '[aria-label*="comment" i]'],
    },
    reddit: {
      points: ['shreddit-post[score]', '[slot="vote-button"]', '[aria-label*="upvote" i]'],
      comments: ['shreddit-post[comment-count]', '[aria-label*="comment" i]'],
      views: ['[aria-label*="view" i]'],
    },
    linkedin: {
      reactions: ['.social-details-social-counts__reactions-count', '[aria-label*="reaction" i]'],
      comments: ['button[aria-label*="comment" i]', '.social-details-social-counts__comments'],
      shares: ['button[aria-label*="repost" i]', '.social-details-social-counts__reposts'],
      views: ['[aria-label*="view" i]'],
    },
    medium: {
      claps: ['button[aria-label*="clap" i]', '[data-testid="clapCount"]'],
      comments: ['button[aria-label*="response" i]', 'a[href$="#responses"]'],
    },
  };
  const raw = metricsFromSelectors(selectorMaps[CHANNEL] || {});
  return {
    views: raw.views,
    likes: raw.likes ?? raw.reactions ?? raw.claps ?? raw.points,
    comments: raw.comments,
    shares: raw.shares,
    saves: raw.saves ?? raw.bookmarks,
  };
}

async function collectMetrics(request) {
  activeRequest = request;
  try {
    await runtime.waitFor(() => document.body?.innerText?.trim(), '等待帖子页面加载超时', 30000);
    await runtime.sleep(1500);
    if (/\/(login|signin|auth)(\/|$)/i.test(window.location.pathname)) {
      throw new Error('帖子地址被平台重定向到登录页，请先登录或确认该内容是公开的');
    }
    const metrics = collectPlatformMetrics();
    const normalized = Object.fromEntries(
      Object.entries(metrics).filter(([, value]) => value !== undefined)
    );
    if (!Object.keys(normalized).length) {
      throw new Error('页面已打开，但当前版本没有识别到公开数据；请下载测试报告并保留页面截图');
    }
    emit('collected', { message: '公开数据已读取', metrics: normalized });
  } catch (error) {
    emit('failed', { error: error?.message || '公开数据读取失败' });
  }
}

if (CHANNEL) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request?.type === 'NOWBUILD_CHANNEL_START') void start(request);
    if (request?.type === 'NOWBUILD_METRICS_START') void collectMetrics(request);
  });

  chrome.runtime.sendMessage({
    type: 'NOWBUILD_CHANNEL_READY',
    channel: CHANNEL,
  });
}
