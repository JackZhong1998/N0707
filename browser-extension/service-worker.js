importScripts('directories/catalog.js');

const WEB_EVENT_TYPE = 'NOWBUILD_EXTENSION_EVENT';
const WEB_COMMAND_TYPE = 'NOWBUILD_EXTENSION_COMMAND';
const SUPPORTED_CHANNELS = new Set([
  'twitter_x',
  'xiaohongshu',
  'hacker_news',
  'devto',
  'reddit',
  'linkedin',
  'medium',
  'hashnode',
  'indie_hackers',
]);

const CHANNEL_HOSTS = {
  twitter_x: ['x.com', 'twitter.com'],
  xiaohongshu: ['xiaohongshu.com', 'xhslink.com'],
  hacker_news: ['news.ycombinator.com'],
  devto: ['dev.to'],
  reddit: ['reddit.com'],
  linkedin: ['linkedin.com'],
  medium: ['medium.com'],
  hashnode: ['hashnode.com', 'hashnode.dev'],
  indie_hackers: ['indiehackers.com'],
};

const DIRECTORY_CATALOG = globalThis.NowBuildDirectoryCatalog;
const DIRECTORY_HOSTS = (DIRECTORY_CATALOG?.directories || []).flatMap(
  (directory) => directory.hosts
);

function isAllowedNowBuildPage(urlString) {
  try {
    const url = new URL(urlString);
    const isLocalDevelopment =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    const isNowBuildProduction =
      url.protocol === 'https:' &&
      (url.hostname === 'nowbuild.ai' || url.hostname.endsWith('.nowbuild.ai'));

    return isLocalDevelopment || isNowBuildProduction;
  } catch {
    return false;
  }
}

function isTrustedExtensionPage(sender) {
  if (sender.id !== chrome.runtime.id) return false;
  const senderUrl = sender.url || sender.tab?.url || '';
  return senderUrl.startsWith(chrome.runtime.getURL(''));
}

function isAllowedCommandSender(sender) {
  return (
    isTrustedExtensionPage(sender) ||
    isAllowedNowBuildPage(sender.tab?.url || sender.url || '')
  );
}

function isXPage(urlString) {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === 'https:' &&
      ['x.com', 'twitter.com'].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      )
    );
  } catch {
    return false;
  }
}

function isNativeInputPage(urlString) {
  if (isXPage(urlString)) return true;
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false;
    return [...Object.values(CHANNEL_HOSTS).flat(), ...DIRECTORY_HOSTS].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

async function insertTextWithDebugger(tabId, text) {
  const target = { tabId };
  let attached = false;
  try {
    await chrome.debugger.attach(target, '1.3');
    attached = true;
    await chrome.debugger.sendCommand(target, 'Input.insertText', { text });
  } catch (error) {
    throw new Error(
      `Chrome 原生输入失败：${error?.message || '无法连接当前平台标签页'}`
    );
  } finally {
    if (attached) {
      try {
        await chrome.debugger.detach(target);
      } catch {
        // The X tab may have closed while detaching.
      }
    }
  }
}

async function clickWithDebugger(tabId, x, y) {
  const target = { tabId };
  let attached = false;
  const point = {
    x: Number(x),
    y: Number(y),
    button: 'left',
    clickCount: 1,
  };
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error('无效的点击坐标');
  }
  try {
    await chrome.debugger.attach(target, '1.3');
    attached = true;
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...point,
    });
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      ...point,
    });
  } catch (error) {
    throw new Error(
      `Chrome 原生点击失败：${error?.message || '无法连接当前标签页'}`
    );
  } finally {
    if (attached) {
      try {
        await chrome.debugger.detach(target);
      } catch {
        // Tab may have navigated away during OAuth.
      }
    }
  }
}

function publishUrl(channel, payload) {
  if (channel === 'twitter_x') return 'https://x.com/compose/post';
  if (channel === 'xiaohongshu') {
    return 'https://creator.xiaohongshu.com/publish/publish';
  }
  if (channel === 'hacker_news') return 'https://news.ycombinator.com/submit';
  if (channel === 'devto') return 'https://dev.to/new';
  if (channel === 'reddit') {
    const community = String(payload?.options?.community || '')
      .trim()
      .replace(/^r\//i, '');
    if (/^[A-Za-z0-9_]{2,21}$/.test(community)) {
      return `https://www.reddit.com/r/${community}/submit?type=TEXT`;
    }
    return 'https://www.reddit.com/submit?type=TEXT';
  }
  if (channel === 'linkedin') return 'https://www.linkedin.com/feed/?shareActive=true';
  if (channel === 'medium') return 'https://medium.com/new-story';
  if (channel === 'hashnode') return 'https://hashnode.com/feed';
  if (channel === 'indie_hackers') return 'https://www.indiehackers.com/new-post';
  throw new Error('Unsupported channel');
}

function isLoginUrl(urlString) {
  try {
    const url = new URL(urlString);
    return /\/(?:login|log-in|signin|sign-in|auth|passport|account)(?:\/|$)/i.test(
      url.pathname
    );
  } catch {
    return true;
  }
}

function validPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!SUPPORTED_CHANNELS.has(payload.channel)) return false;
  if (!payload.requestId || typeof payload.requestId !== 'string') return false;
  if (!payload.content || typeof payload.content !== 'object') return false;
  const title = String(payload.content.title || '');
  const body = String(payload.content.body || '');
  const url = String(payload.content.url || '');
  if (url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    } catch {
      return false;
    }
  }
  return title.length <= 500 && body.length <= 20000 && url.length <= 2048;
}

function validMetricsPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!SUPPORTED_CHANNELS.has(payload.channel)) return false;
  if (!payload.requestId || typeof payload.requestId !== 'string') return false;
  try {
    const url = new URL(payload.postUrl);
    if (url.protocol !== 'https:') return false;
    if (payload.channel === 'hashnode') return true;
    return (CHANNEL_HOSTS[payload.channel] || []).some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function originPattern(urlString) {
  const url = new URL(urlString);
  return `${url.origin}/*`;
}

async function blobToDataUrl(blob) {
  if (blob.size > 1_500_000) throw new Error('Image exceeds 1.5MB');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
}

async function downloadSiteAsset(candidate) {
  const response = await fetch(candidate.url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`Image returned ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Asset is not an image');
  return {
    kind: candidate.kind,
    name: candidate.name,
    dataUrl: await blobToDataUrl(blob),
    sourceUrl: candidate.url,
    source: 'metadata',
  };
}

async function collectSiteAssets(request, sender) {
  if (!isAllowedCommandSender(sender)) throw new Error('Untrusted NowBuild page');
  let productUrl;
  try {
    productUrl = new URL(request.payload?.productUrl);
    if (productUrl.protocol !== 'https:') throw new Error();
  } catch {
    throw new Error('Invalid product URL');
  }

  const pageOrigin = `${productUrl.origin}/*`;
  const granted = await chrome.permissions.request({ origins: [pageOrigin] });
  if (!granted) throw new Error('需要授权读取该产品官网的公开素材');

  const previousTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const previousTabId = previousTabs[0]?.id;
  const tab = await chrome.tabs.create({ url: productUrl.href, active: true });
  if (!tab.id) throw new Error('Failed to open product website');

  try {
    await waitForTabComplete(tab.id);
    await sleep(800);
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const absolute = (value) => {
          try { return new URL(value, document.baseURI).href; } catch { return null; }
        };
        const meta = (selectors) => selectors
          .map((selector) => document.querySelector(selector)?.content)
          .map(absolute)
          .find(Boolean);
        const icon = [
          'link[rel~="apple-touch-icon"]',
          'link[rel="apple-touch-icon"]',
          'link[rel~="icon"][sizes="192x192"]',
          'link[rel~="icon"][sizes="180x180"]',
          'link[rel~="icon"][type="image/png"]',
          'link[rel~="icon"][type="image/svg+xml"]',
          'link[rel~="icon"]',
        ].map((selector) => absolute(document.querySelector(selector)?.href)).find(Boolean);
        // Prefer explicit brand logo meta/icons. Do not scrape arbitrary <img>
        // tags — customer logo walls and partner rows look like "logo" too.
        return {
          title: document.title,
          logo: meta([
            'meta[property="og:logo"]',
            'meta[itemprop="logo"]',
          ]) || icon,
          image: meta([
            'meta[property="og:image"]',
            'meta[property="og:image:secure_url"]',
            'meta[name="twitter:image"]',
            'meta[name="twitter:image:src"]',
          ]),
        };
      },
    });

    const candidates = [
      result?.logo && { kind: 'logo', name: 'website-logo', url: result.logo },
      result?.image && { kind: 'screenshot', name: 'website-og-image', url: result.image },
    ].filter(Boolean);
    const extraOrigins = [...new Set(candidates
      .map((candidate) => originPattern(candidate.url))
      .filter((origin) => origin !== pageOrigin))];
    if (extraOrigins.length) {
      try { await chrome.permissions.request({ origins: extraOrigins }); } catch {}
    }

    const assets = [];
    for (const candidate of candidates) {
      try { assets.push(await downloadSiteAsset(candidate)); } catch {}
    }
    try {
      assets.push({
        kind: 'screenshot',
        name: 'homepage-first-screen.jpg',
        dataUrl: await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: 'jpeg',
          quality: 72,
        }),
        sourceUrl: productUrl.href,
        source: 'homepage_capture',
      });
    } catch {}
    if (!assets.length) throw new Error('官网已打开，但没有读取到可用图片');
    return { assets };
  } finally {
    try { await chrome.tabs.remove(tab.id); } catch {}
    if (previousTabId) {
      try { await chrome.tabs.update(previousTabId, { active: true }); } catch {}
    }
  }
}

function isKnownChannelHost(channel, urlString) {
  try {
    const url = new URL(urlString);
    return (CHANNEL_HOSTS[channel] || []).some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

async function hasCustomMetricsPermission(payload) {
  if (payload.channel !== 'hashnode' || isKnownChannelHost('hashnode', payload.postUrl)) {
    return true;
  }
  return chrome.permissions.contains({
    origins: [originPattern(payload.postUrl)],
  });
}

function validDirectoryPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Missing payload';
  if (!payload.requestId || typeof payload.requestId !== 'string') {
    return 'Missing requestId';
  }
  const directory = DIRECTORY_CATALOG?.byId(payload.directoryId);
  if (!directory) return `Unknown directory: ${payload.directoryId || '(empty)'}`;
  const kit = payload.launchKit;
  if (!kit || typeof kit !== 'object') return 'Missing launchKit';
  const stringLimits = {
    productName: 120,
    productUrl: 2048,
    tagline: 180,
    shortDescription: 1000,
    longDescription: 12000,
    pricing: 80,
    founderName: 160,
    founderEmail: 320,
    founderUrl: 2048,
    twitterUrl: 2048,
    linkedinUrl: 2048,
    demoUrl: 2048,
    launchDate: 40,
  };
  for (const [key, limit] of Object.entries(stringLimits)) {
    if (kit[key] !== undefined && typeof kit[key] !== 'string') {
      return `${key} must be a string`;
    }
    if (String(kit[key] || '').length > limit) {
      return `${key} exceeds ${limit} characters`;
    }
  }
  const required = ['productName', 'productUrl', 'tagline', 'shortDescription'];
  const missing = required.find((key) => !String(kit[key] || '').trim());
  if (missing) return `Missing required field: ${missing}`;
  try {
    const url = new URL(kit.productUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'productUrl must be http(s)';
    }
  } catch {
    return 'Invalid productUrl';
  }
  for (const key of ['founderUrl', 'twitterUrl', 'linkedinUrl', 'demoUrl']) {
    const value = String(kit[key] || '').trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return `${key} must be http(s)`;
      }
    } catch {
      return `Invalid ${key}`;
    }
  }
  for (const key of ['categories', 'tags']) {
    if (kit[key] !== undefined && !Array.isArray(kit[key])) {
      return `${key} must be an array`;
    }
    const values = Array.isArray(kit[key]) ? kit[key] : [];
    if (values.length > (key === 'categories' ? 5 : 10)) {
      return `${key} has too many items`;
    }
    if (values.some((value) => typeof value !== 'string' || value.length > 80)) {
      return `${key} items must be strings up to 80 characters`;
    }
  }
  const assets = Array.isArray(kit.assets) ? kit.assets : [];
  if (assets.length > 6) return 'Too many assets';
  let assetSize = 0;
  for (const asset of assets) {
    if (!asset || typeof asset !== 'object') return 'Invalid asset';
    if (!['logo', 'screenshot'].includes(asset.kind)) return 'Invalid asset kind';
    if (typeof asset.dataUrl !== 'string' || !asset.dataUrl.startsWith('data:image/')) {
      return 'Asset must be a data:image URL';
    }
    assetSize += asset.dataUrl.length;
  }
  if (assetSize > 7_000_000) return 'Assets exceed size limit';
  return null;
}

function sanitizeDirectoryLaunchKit(kit) {
  if (!kit || typeof kit !== 'object') return kit;
  const stringLimits = {
    productName: 120,
    productUrl: 2048,
    tagline: 180,
    shortDescription: 1000,
    longDescription: 12000,
    pricing: 80,
    founderName: 160,
    founderEmail: 320,
    founderUrl: 2048,
    twitterUrl: 2048,
    linkedinUrl: 2048,
    demoUrl: 2048,
    launchDate: 40,
  };
  const next = { ...kit };
  for (const [key, limit] of Object.entries(stringLimits)) {
    if (next[key] !== undefined && next[key] !== null) {
      next[key] = String(next[key]).slice(0, limit);
    }
  }
  for (const key of ['founderUrl', 'twitterUrl', 'linkedinUrl', 'demoUrl']) {
    const value = String(next[key] || '').trim();
    if (!value) {
      next[key] = '';
      continue;
    }
    try {
      const url = new URL(value);
      next[key] = ['http:', 'https:'].includes(url.protocol) ? value : '';
    } catch {
      next[key] = '';
    }
  }
  for (const [key, maxItems] of [
    ['categories', 5],
    ['tags', 10],
  ]) {
    if (!Array.isArray(next[key])) {
      next[key] = [];
      continue;
    }
    next[key] = next[key]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, maxItems);
  }
  const assets = Array.isArray(next.assets) ? [...next.assets] : [];
  const filtered = assets
    .filter(
      (asset) =>
        asset &&
        typeof asset === 'object' &&
        ['logo', 'screenshot'].includes(asset.kind) &&
        typeof asset.dataUrl === 'string' &&
        asset.dataUrl.startsWith('data:image/')
    )
    .slice(0, 6);
  let assetSize = filtered.reduce((sum, asset) => sum + asset.dataUrl.length, 0);
  while (assetSize > 7_000_000 && filtered.length > 0) {
    const dropIndex = [...filtered]
      .map((asset, index) => ({ asset, index }))
      .reverse()
      .find((item) => item.asset.kind === 'screenshot')?.index;
    const index = dropIndex === undefined ? filtered.length - 1 : dropIndex;
    assetSize -= filtered[index].dataUrl.length;
    filtered.splice(index, 1);
  }
  next.assets = filtered;
  return next;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTabComplete(tabId, timeout = 45000) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === 'complete') return;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('打开帖子页面超时'));
    }, timeout);

    function onUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId || info.status !== 'complete') return;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function groupNowBuildTab(tab) {
  if (!tab?.id || tab.windowId === undefined) return;
  try {
    const groups = await chrome.tabGroups.query({
      windowId: tab.windowId,
      title: 'NowBuild',
    });
    const existing = groups.find((group) => group.title === 'NowBuild');
    const groupId = existing
      ? await chrome.tabs.group({ groupId: existing.id, tabIds: [tab.id] })
      : await chrome.tabs.group({ tabIds: [tab.id] });
    await chrome.tabGroups.update(groupId, {
      title: 'NowBuild',
      color: 'cyan',
      collapsed: false,
    });
  } catch {
    // Grouping is organizational only and must never block publishing.
  }
}

async function readJobs() {
  const stored = await chrome.storage.local.get('nowbuildActiveJobs');
  return stored.nowbuildActiveJobs || {};
}

async function writeJobs(jobs) {
  await chrome.storage.local.set({ nowbuildActiveJobs: jobs });
}

async function readDirectoryFlows() {
  const stored = await chrome.storage.local.get('nowbuildDirectoryFlows');
  return stored.nowbuildDirectoryFlows || {};
}

async function writeDirectoryFlows(flows) {
  await chrome.storage.local.set({ nowbuildDirectoryFlows: flows });
}

async function sendToClient(job, event) {
  if (job.clientType === 'extension') {
    try {
      await chrome.runtime.sendMessage({
        type: WEB_EVENT_TYPE,
        requestId: job.requestId,
        ...event,
      });
    } catch {
      // The extension test console may have been closed.
    }
    return;
  }
  if (!job.webTabId) return;
  try {
    await chrome.tabs.sendMessage(job.webTabId, {
      type: WEB_EVENT_TYPE,
      requestId: job.requestId,
      ...event,
    });
  } catch {
    // The NowBuild tab may have been closed. The job remains recoverable locally.
  }
}

async function focusWebTab(webTabId) {
  if (!webTabId) return;
  try {
    const tab = await chrome.tabs.get(webTabId);
    if (tab.windowId !== undefined) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    await chrome.tabs.update(webTabId, { active: true });
  } catch {
    // The NowBuild tab may have been closed.
  }
}

async function closeTargetTab(tabId) {
  if (!tabId) return;
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // The target tab may already be closed.
  }
}

async function updateJob(job, patch) {
  const jobs = await readJobs();
  const next = { ...job, ...patch, updatedAt: Date.now() };
  jobs[job.requestId] = next;
  await writeJobs(jobs);
  return next;
}

async function removeJob(requestId) {
  const jobs = await readJobs();
  delete jobs[requestId];
  await writeJobs(jobs);
}

async function findJobByTargetTab(targetTabId) {
  const jobs = await readJobs();
  return Object.values(jobs).find((job) => job.targetTabId === targetTabId);
}

async function dispatchJob(job) {
  const jobs = await readJobs();
  const current = jobs[job.requestId];
  if (!current || current.startedAt) return;
  const claimed = await updateJob(current, { startedAt: Date.now() });
  try {
    await chrome.tabs.sendMessage(claimed.targetTabId, {
      type:
        claimed.kind === 'metrics'
          ? 'NOWBUILD_METRICS_START'
          : claimed.kind === 'directory'
            ? 'NOWBUILD_DIRECTORY_START'
            : 'NOWBUILD_CHANNEL_START',
      requestId: claimed.requestId,
      content: claimed.content,
      options: {
        ...(claimed.options || {}),
        verifySubmission: claimed.pendingSubmissionVerification === true,
        submissionStartUrl: claimed.submissionStartUrl,
      },
      postUrl: claimed.postUrl,
      directoryId: claimed.directoryId,
      launchKit: claimed.launchKit,
    });
    await sendToClient(claimed, {
      status: claimed.kind === 'metrics' ? 'collecting' : 'filling',
      message:
        claimed.kind === 'metrics'
          ? '正在后台读取帖子公开数据'
          : claimed.kind === 'directory'
            ? '正在识别目录字段并填写 Launch Kit'
            : '正在填写发布内容',
    });
  } catch {
    // The content script may not be ready yet. CHANNEL_READY will retry.
    await updateJob(claimed, { startedAt: null });
  }
}

async function runMetricsCollection(job) {
  await sendToClient(job, {
    status: 'opening',
    message: '正在后台打开帖子页面',
  });
  try {
    await waitForTabComplete(job.targetTabId);
    if (job.channel === 'hashnode' && !isKnownChannelHost('hashnode', job.postUrl)) {
      await chrome.scripting.executeScript({
        target: { tabId: job.targetTabId },
        func: (channel) => {
          globalThis.NowBuildForcedChannel = channel;
        },
        args: ['hashnode'],
      });
      await chrome.scripting.executeScript({
        target: { tabId: job.targetTabId },
        files: ['channels/common.js', 'channels/platforms.js'],
      });
    }
    await sleep(job.channel === 'xiaohongshu' ? 2200 : 1000);
    await dispatchJob(job);
  } catch (error) {
    await sendToClient(job, {
      status: 'failed',
      error: error?.message || 'Collection failed',
    });
    await removeJob(job.requestId);
    await closeTargetTab(job.targetTabId);
    await focusWebTab(job.webTabId);
  }
}

async function startPublish(request, sender) {
  if (!isAllowedCommandSender(sender)) {
    throw new Error('Untrusted NowBuild page');
  }
  if (!validPayload(request.payload)) throw new Error('Invalid publish request');

  const payload = request.payload;
  const jobs = await readJobs();
  if (jobs[payload.requestId]) throw new Error('This request has already been used');

  const targetTab = await chrome.tabs.create({
    url: publishUrl(payload.channel, payload),
    active: true,
  });
  if (!targetTab.id) throw new Error('Failed to open the publish page');
  await groupNowBuildTab(targetTab);

  const job = {
    kind: 'publish',
    requestId: payload.requestId,
    channel: payload.channel,
    content: payload.content,
    clientType: isTrustedExtensionPage(sender) ? 'extension' : 'web',
    webTabId: sender.tab?.id,
    targetTabId: targetTab.id,
    mode: payload.options?.mode === 'dry_run' ? 'dry_run' : 'live',
    options: payload.options || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs[payload.requestId] = job;
  await writeJobs(jobs);
  void dispatchJob(job);
  await sendToClient(job, {
    status: 'opening',
    message: '发布页面已打开',
  });
  return { accepted: true, requestId: payload.requestId };
}

async function startMetricsCollection(request, sender) {
  if (!isAllowedCommandSender(sender)) {
    throw new Error('Untrusted NowBuild page');
  }
  if (!validMetricsPayload(request.payload)) {
    throw new Error('Invalid metrics request');
  }
  const payload = request.payload;
  if (!(await hasCustomMetricsPermission(payload))) {
    throw new Error(
      'Hashnode 自定义域名尚未授权；请从插件测试台重新获取数据并允许访问该站点'
    );
  }
  const jobs = await readJobs();
  if (jobs[payload.requestId]) throw new Error('This request has already been used');

  const targetTab = await chrome.tabs.create({
    url: payload.postUrl,
    active: false,
  });
  if (!targetTab.id) throw new Error('Failed to open the post');
  await groupNowBuildTab(targetTab);

  const job = {
    kind: 'metrics',
    requestId: payload.requestId,
    channel: payload.channel,
    postUrl: payload.postUrl,
    clientType: isTrustedExtensionPage(sender) ? 'extension' : 'web',
    webTabId: sender.tab?.id,
    targetTabId: targetTab.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs[payload.requestId] = job;
  await writeJobs(jobs);
  void runMetricsCollection(job);
  return { accepted: true, requestId: payload.requestId };
}

async function startDirectorySubmission(request, sender) {
  if (!isAllowedCommandSender(sender)) {
    throw new Error('Untrusted NowBuild page');
  }
  if (request.payload?.launchKit) {
    request.payload.launchKit = sanitizeDirectoryLaunchKit(request.payload.launchKit);
  }
  const invalidReason = validDirectoryPayload(request.payload);
  if (invalidReason) {
    throw new Error(`Invalid directory submission request: ${invalidReason}`);
  }
  const payload = request.payload;
  const directory = DIRECTORY_CATALOG.byId(payload.directoryId);
  const allowFinalSubmit =
    payload.options?.allowFinalSubmit === true &&
    payload.options?.mode === 'live' &&
    directory.submissionPolicy === 'auto_submit_opt_in' &&
    directory.pricing === 'Free' &&
    !directory.blocker;
  const mode = allowFinalSubmit ? 'live' : 'dry_run';
  const jobs = await readJobs();
  if (jobs[payload.requestId]) throw new Error('This request has already been used');

  const targetTab = await chrome.tabs.create({
    url: directory.submitUrl,
    // Directory batches are queued by NowBuild. Keep normal form preparation
    // in the background; blockers raise a persistent notification that brings
    // the exact tab forward when the user is needed.
    active: false,
  });
  if (!targetTab.id) throw new Error('Failed to open the directory submission page');
  await groupNowBuildTab(targetTab);

  const job = {
    kind: 'directory',
    requestId: payload.requestId,
    channel: 'directory',
    directoryId: payload.directoryId,
    launchKit: payload.launchKit,
    clientType: isTrustedExtensionPage(sender) ? 'extension' : 'web',
    webTabId: sender.tab?.id,
    targetTabId: targetTab.id,
    mode,
    options: {
      ...(payload.options || {}),
      mode,
      allowFinalSubmit,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs[payload.requestId] = job;
  await writeJobs(jobs);
  void dispatchJob(job);
  await sendToClient(job, {
    status: 'opening',
    message: `${directory.name} 提交页面已打开`,
  });
  return { accepted: true, requestId: payload.requestId };
}

async function startDirectoryRecording(request, sender) {
  if (!isAllowedCommandSender(sender)) throw new Error('Untrusted NowBuild page');
  if (request.payload?.launchKit) {
    request.payload.launchKit = sanitizeDirectoryLaunchKit(request.payload.launchKit);
  }
  const invalidReason = validDirectoryPayload(request.payload);
  if (invalidReason) {
    throw new Error(`Invalid directory recording request: ${invalidReason}`);
  }
  const payload = request.payload;
  const directory = DIRECTORY_CATALOG.byId(payload.directoryId);
  const jobs = await readJobs();
  if (jobs[payload.requestId]) throw new Error('This request has already been used');

  const targetTab = await chrome.tabs.create({ url: directory.submitUrl, active: true });
  if (!targetTab.id) throw new Error('Failed to open the directory page');
  await groupNowBuildTab(targetTab);

  const flows = await readDirectoryFlows();
  flows[payload.directoryId] = {
    directoryId: payload.directoryId,
    directoryName: directory.name,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    stages: [],
  };
  await writeDirectoryFlows(flows);

  const job = {
    kind: 'directory_record',
    requestId: payload.requestId,
    channel: 'directory',
    directoryId: payload.directoryId,
    launchKit: payload.launchKit,
    clientType: isTrustedExtensionPage(sender) ? 'extension' : 'web',
    webTabId: sender.tab?.id,
    targetTabId: targetTab.id,
    mode: 'record',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs[payload.requestId] = job;
  await writeJobs(jobs);
  await sendToClient(job, {
    status: 'recording',
    message: `${directory.name} 已进入流程录制。请自行登录并按真实顺序操作；不要输入测试账号以外的敏感资料。`,
  });
  return { accepted: true, requestId: payload.requestId };
}

function publicJobState(job) {
  return {
    requestId: job.requestId,
    kind: job.kind,
    channel: job.channel,
    directoryId: job.directoryId,
    mode: job.mode || 'live',
    targetTabId: job.targetTabId,
    lastStatus: job.lastStatus || 'queued',
    postUrl: job.postUrl,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

async function notifyUserTakeover(job, message) {
  const directory = job.directoryId
    ? DIRECTORY_CATALOG?.byId(job.directoryId)
    : null;
  await chrome.notifications.create(`takeover:${job.requestId}`, {
    type: 'basic',
    iconUrl: 'assets/nowbuild-logo-128.png',
    title: directory
      ? `${directory.name} 需要你处理`
      : 'NowBuild 需要你处理',
    message: message || '请完成登录、验证或首次资料确认，完成后返回 NowBuild 点击继续。',
    priority: 2,
    requireInteraction: true,
  });
}

chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith('takeover:')) return;
  const requestId = notificationId.slice('takeover:'.length);
  void readJobs().then(async (jobs) => {
    const job = jobs[requestId];
    if (job?.targetTabId) {
      const tab = await chrome.tabs.update(job.targetTabId, { active: true });
      if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (
    request?.type === 'NOWBUILD_X_INSERT_TEXT' ||
    request?.type === 'NOWBUILD_NATIVE_INSERT_TEXT'
  ) {
    const text = typeof request.text === 'string' ? request.text : '';
    if (
      !sender.tab?.id ||
      !isNativeInputPage(sender.tab.url || '') ||
      !text ||
      text.length > 25000
    ) {
      sendResponse({ ok: false, error: '无效的浏览器原生输入请求' });
      return false;
    }
    void insertTextWithDebugger(sender.tab.id, text)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({ ok: false, error: error?.message || 'Chrome 原生输入失败' })
      );
    return true;
  }

  if (request?.type === WEB_COMMAND_TYPE) {
    if (request.command === 'PING') {
      sendResponse({
        ok: true,
        installed: true,
        version: chrome.runtime.getManifest().version,
        supportedChannels: [...SUPPORTED_CHANNELS],
        supportedDirectories: (DIRECTORY_CATALOG?.directories || []).map(
          ({
            id,
            name,
            pricing,
            entryStage,
            requirements,
            requirementsConfidence,
            assetSpecs,
            submissionPolicy,
          }) => ({
            id,
            name,
            pricing,
            entryStage,
            requirements,
            requirementsConfidence,
            assetSpecs,
            submissionPolicy,
          })
        ),
      });
      return false;
    }

    if (request.command === 'GET_TASK_STATE') {
      if (!isAllowedCommandSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted command sender' });
        return false;
      }
      void readJobs()
        .then((jobs) =>
          sendResponse({
            ok: true,
            tasks: Object.values(jobs).map(publicJobState),
          })
        )
        .catch((error) =>
          sendResponse({
            ok: false,
            error: error?.message || 'Failed to read task state',
          })
        );
      return true;
    }

    if (request.command === 'PUBLISH') {
      startPublish(request, sender)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) =>
          sendResponse({ ok: false, error: error?.message || 'Publish failed' })
        );
      return true;
    }

    if (request.command === 'COLLECT_METRICS') {
      startMetricsCollection(request, sender)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) =>
          sendResponse({ ok: false, error: error?.message || 'Collection failed' })
        );
      return true;
    }

    if (request.command === 'COLLECT_SITE_ASSETS') {
      collectSiteAssets(request, sender)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) =>
          sendResponse({ ok: false, error: error?.message || 'Asset collection failed' })
        );
      return true;
    }

    if (request.command === 'RESUME_TASK') {
      if (!isAllowedCommandSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted command sender' });
        return false;
      }
      void (async () => {
        const jobs = await readJobs();
        const job = jobs[request.requestId];
        if (!job) throw new Error('Task is no longer active');
        const resumed = await updateJob(job, {
          startedAt: null,
          lastStatus: 'opening',
          waitingForLogin: false,
        });
        await chrome.notifications.clear(`takeover:${job.requestId}`);
        await dispatchJob(resumed);
        sendResponse({ ok: true });
      })().catch((error) =>
        sendResponse({ ok: false, error: error?.message || 'Resume failed' })
      );
      return true;
    }

    if (request.command === 'FOCUS_TASK') {
      if (!isAllowedCommandSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted command sender' });
        return false;
      }
      void (async () => {
        const jobs = await readJobs();
        const job = jobs[request.requestId];
        if (!job?.targetTabId) throw new Error('Task page is no longer available');
        const tab = await chrome.tabs.update(job.targetTabId, { active: true });
        if (tab.windowId !== undefined) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
        sendResponse({ ok: true });
      })().catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message || 'Failed to open task page',
        })
      );
      return true;
    }

    if (request.command === 'DIRECTORY_SUBMIT') {
      startDirectorySubmission(request, sender)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) =>
          sendResponse({
            ok: false,
            error: error?.message || 'Directory submission failed',
          })
        );
      return true;
    }

    if (request.command === 'DIRECTORY_RECORD_START') {
      startDirectoryRecording(request, sender)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) =>
          sendResponse({ ok: false, error: error?.message || 'Recording failed' })
        );
      return true;
    }

    if (request.command === 'GET_DIRECTORY_FLOWS') {
      if (!isAllowedCommandSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted command sender' });
        return false;
      }
      void readDirectoryFlows()
        .then((flows) => sendResponse({ ok: true, flows }))
        .catch((error) => sendResponse({ ok: false, error: error?.message }));
      return true;
    }

    if (request.command === 'IMPORT_DIRECTORY_FLOWS') {
      if (!isAllowedCommandSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted command sender' });
        return false;
      }
      void (async () => {
        const incoming = request.flows;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          throw new Error('Invalid directory flows');
        }
        const flows = await readDirectoryFlows();
        for (const [directoryId, flow] of Object.entries(incoming)) {
          if (!flow || !Array.isArray(flow.stages)) continue;
          flows[directoryId] = {
            ...flow,
            directoryId,
            importedAt: Date.now(),
          };
        }
        await writeDirectoryFlows(flows);
        sendResponse({ ok: true, flows });
      })().catch((error) => sendResponse({ ok: false, error: error?.message }));
      return true;
    }

    if (request.command === 'DELETE_DIRECTORY_FLOW') {
      if (!isAllowedCommandSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted command sender' });
        return false;
      }
      void (async () => {
        const directoryId = String(request.directoryId || '');
        const flows = await readDirectoryFlows();
        delete flows[directoryId];
        await writeDirectoryFlows(flows);
        sendResponse({ ok: true });
      })();
      return true;
    }

    if (request.command === 'CANCEL') {
      if (!isAllowedCommandSender(sender)) {
        sendResponse({ ok: false, error: 'Untrusted command sender' });
        return false;
      }
      void (async () => {
        const jobs = await readJobs();
        const job = jobs[request.requestId];
        if (job?.targetTabId) {
          await closeTargetTab(job.targetTabId);
        }
        if (job) await removeJob(job.requestId);
        sendResponse({ ok: true });
      })();
      return true;
    }
  }

  if (request?.type === 'NOWBUILD_CHANNEL_READY' && sender.tab?.id) {
    void (async () => {
      const job = await findJobByTargetTab(sender.tab.id);
      if (!job || job.channel !== request.channel) return;
      if (job.waitingForLogin) {
        if (isLoginUrl(sender.tab.url || '')) return;
        const destination = publishUrl(job.channel, { options: job.options });
        const resumed = await updateJob(job, {
          waitingForLogin: false,
          startedAt: null,
          lastStatus: 'opening',
        });
        if ((sender.tab.url || '') !== destination) {
          await sendToClient(resumed, {
            status: 'opening',
            message: '登录已完成，正在自动返回发布编辑器',
          });
          await chrome.tabs.update(sender.tab.id, { url: destination });
          return;
        }
        await dispatchJob(resumed);
        return;
      }
      await dispatchJob(job);
    })();
    return false;
  }

  if (request?.type === 'NOWBUILD_DIRECTORY_READY' && sender.tab?.id) {
    void (async () => {
      const job = await findJobByTargetTab(sender.tab.id);
      if (!job || job.kind !== 'directory' || job.directoryId !== request.directoryId) {
        return;
      }
      await dispatchJob(job);
    })();
    return false;
  }

  if (request?.type === 'NOWBUILD_GOOGLE_AUTH_HELLO' && sender.tab?.id) {
    void (async () => {
      const job =
        (await findJobByTargetTab(sender.tab.id)) ||
        (sender.tab.openerTabId
          ? await findJobByTargetTab(sender.tab.openerTabId)
          : null);
      sendResponse({
        active: Boolean(
          job &&
            (job.kind === 'directory' || job.kind === 'directory_record')
        ),
        directoryId: job?.directoryId || null,
      });
    })();
    return true;
  }

  if (request?.type === 'NOWBUILD_TRUSTED_CLICK' && sender.tab?.id) {
    void (async () => {
      try {
        const job =
          (await findJobByTargetTab(sender.tab.id)) ||
          (sender.tab.openerTabId
            ? await findJobByTargetTab(sender.tab.openerTabId)
            : null);
        if (
          !job ||
          (job.kind !== 'directory' && job.kind !== 'directory_record')
        ) {
          sendResponse({ ok: false, error: 'no_active_directory_job' });
          return;
        }
        await clickWithDebugger(sender.tab.id, request.x, request.y);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || 'trusted_click_failed',
        });
      }
    })();
    return true;
  }

  if (request?.type === 'NOWBUILD_GOOGLE_AUTH_EVENT' && sender.tab?.id) {
    void (async () => {
      const job =
        (await findJobByTargetTab(sender.tab.id)) ||
        (sender.tab.openerTabId
          ? await findJobByTargetTab(sender.tab.openerTabId)
          : null);
      if (!job || (job.kind !== 'directory' && job.kind !== 'directory_record')) {
        return;
      }
      await sendToClient(job, {
        status: request.status || 'navigating',
        message: request.message,
        directoryResult: {
          directoryId: job.directoryId,
          ...(request.detail || {}),
        },
      });
      if (
        request.detail?.stage === 'google_consent' &&
        sender.tab.openerTabId === job.targetTabId
      ) {
        setTimeout(() => {
          void dispatchJob(job);
        }, 1800);
      }
    })();
    return false;
  }

  if (request?.type === 'NOWBUILD_DIRECTORY_RECORDER_HELLO' && sender.tab?.id) {
    void (async () => {
      const job = await findJobByTargetTab(sender.tab.id);
      if (
        !job ||
        job.kind !== 'directory_record' ||
        job.directoryId !== request.directoryId
      ) {
        sendResponse({ active: false });
        return;
      }
      const flows = await readDirectoryFlows();
      const flow = flows[job.directoryId];
      const key = (() => {
        try {
          const url = new URL(request.pageUrl);
          return `${url.hostname}${url.pathname}`;
        } catch {
          return '';
        }
      })();
      const stage = flow?.stages?.find((item) => item.key === key);
      sendResponse({
        active: true,
        requestId: job.requestId,
        launchKit: job.launchKit,
        stageActionCount: stage?.actions?.length || 0,
      });
    })();
    return true;
  }

  if (request?.type === 'NOWBUILD_DIRECTORY_RECORD_ACTION' && sender.tab?.id) {
    void (async () => {
      const job = await findJobByTargetTab(sender.tab.id);
      if (
        !job ||
        job.kind !== 'directory_record' ||
        job.requestId !== request.requestId ||
        job.directoryId !== request.directoryId
      ) return;
      const flows = await readDirectoryFlows();
      const flow = flows[job.directoryId];
      if (!flow) return;
      let stage = flow.stages.find((item) => item.key === request.stage?.key);
      if (!stage) {
        stage = {
          key: request.stage?.key,
          firstUrl: request.stage?.url,
          title: request.stage?.title,
          order: flow.stages.length,
          actions: [],
        };
        flow.stages.push(stage);
      }
      const action = request.action || {};
      const duplicate = stage.actions.at(-1);
      if (
        !duplicate ||
        action.type === 'click' ||
        duplicate.type !== action.type ||
        duplicate.selector !== action.selector ||
        duplicate.kitKey !== action.kitKey
      ) {
        stage.actions.push(action);
      }
      stage.lastUrl = request.stage?.url;
      flow.updatedAt = Date.now();
      await writeDirectoryFlows(flows);
      await sendToClient(job, {
        status: 'recording',
        message: `已记录 Stage ${stage.order + 1} · ${stage.actions.length} 个动作`,
        directoryResult: {
          directoryId: job.directoryId,
          stages: flow.stages.length,
          actions: flow.stages.reduce((total, item) => total + item.actions.length, 0),
        },
      });
    })();
    return false;
  }

  if (request?.type === 'NOWBUILD_DIRECTORY_RECORD_FINISH' && sender.tab?.id) {
    void (async () => {
      const job = await findJobByTargetTab(sender.tab.id);
      if (!job || job.kind !== 'directory_record' || job.requestId !== request.requestId) {
        return;
      }
      const flows = await readDirectoryFlows();
      const flow = flows[job.directoryId];
      await sendToClient(job, {
        status: 'recorded',
        message: `${flow?.directoryName || job.directoryId} 流程已保存，可用于后续分阶段预填`,
        directoryResult: {
          directoryId: job.directoryId,
          stages: flow?.stages?.length || 0,
          actions:
            flow?.stages?.reduce((total, stage) => total + stage.actions.length, 0) || 0,
        },
      });
      await removeJob(job.requestId);
    })();
    return false;
  }

  if (request?.type === 'NOWBUILD_CHANNEL_EVENT' && sender.tab?.id) {
    void (async () => {
      const job = await findJobByTargetTab(sender.tab.id);
      if (!job || job.requestId !== request.requestId) return;
      const next = await updateJob(job, {
        lastStatus: request.status,
        postUrl: request.postUrl || job.postUrl,
      });
      const isPreparedDryRun =
        job.mode === 'dry_run' && request.status === 'awaiting_user';
      const isLoginBlock =
        request.status === 'blocked' && request.blocker === 'login_required';
      await sendToClient(next, {
        status: isPreparedDryRun
          ? 'prepared'
          : isLoginBlock
            ? 'waiting_login'
            : request.status,
        message: isPreparedDryRun
          ? `Dry Run 已完成填写。请检查${job.kind === 'directory' ? '目录表单' : '平台页面'}后直接关闭标签页，不要点击最终${job.kind === 'directory' ? '提交' : '发布'}。${
              request.adapterVersion ? ` · ${request.adapterVersion}` : ''
            }`
          : isLoginBlock
            ? `${request.message}。无需重新运行，插件会在登录成功后自动继续。`
            : request.message,
        postUrl: request.postUrl,
        postUrlConfidence: request.postUrlConfidence,
        error: request.error,
        metrics: request.metrics,
        threadCount: request.threadCount,
        weightedLength: request.weightedLength,
        adapterVersion: request.adapterVersion,
        expectedLength: request.expectedLength,
        actualLength: request.actualLength,
        blocker: request.blocker,
        directoryResult: request.directoryResult,
      });

      if (request.status === 'publishing' && job.kind === 'directory') {
        await updateJob(next, {
          startedAt: null,
          pendingSubmissionVerification: true,
          submissionStartUrl:
            request.directoryResult?.pageUrl || sender.tab.url || null,
        });
        return;
      }

      if (request.status === 'navigating' || request.status === 'needs_user_action') {
        await updateJob(next, { startedAt: null });
        if (request.status === 'needs_user_action') {
          await notifyUserTakeover(next, request.message);
        }
        return;
      }

      if (isPreparedDryRun) {
        await removeJob(job.requestId);
        return;
      }

      if (request.status === 'published') {
        await removeJob(job.requestId);
        await focusWebTab(job.webTabId);
        return;
      }

      if (request.status === 'blocked') {
        if (isLoginBlock) {
          await updateJob(next, {
            startedAt: null,
            waitingForLogin: true,
            lastStatus: 'waiting_login',
          });
          await notifyUserTakeover(
            next,
            request.message ||
              '请先在打开的平台页面完成登录；登录成功后插件会自动继续，无需重新点击发布。'
          );
          return;
        }
        await removeJob(job.requestId);
        await focusWebTab(job.webTabId);
        return;
      }

      if (request.status === 'collected') {
        await removeJob(job.requestId);
        await closeTargetTab(sender.tab.id);
        await focusWebTab(job.webTabId);
        return;
      }

      if (request.status === 'failed') {
        await removeJob(job.requestId);
        if (job.mode !== 'dry_run') {
          await closeTargetTab(sender.tab.id);
          await focusWebTab(job.webTabId);
        }
      }
    })();
    return false;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const job = await findJobByTargetTab(tabId);
    if (!job) return;
    if (job.lastStatus !== 'published' && job.lastStatus !== 'collected') {
      await sendToClient(job, {
        status: 'failed',
        error:
          job.kind === 'metrics'
            ? '帖子页面已关闭，数据采集未完成'
            : job.kind === 'directory' || job.kind === 'directory_record'
              ? '目录提交页面已关闭，Dry Run 没有完成'
              : '发布页面已关闭，任务没有确认完成',
      });
      await removeJob(job.requestId);
      await focusWebTab(job.webTabId);
    }
  })();
});
