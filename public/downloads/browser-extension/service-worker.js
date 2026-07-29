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
  hashnode: ['hashnode.com'],
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
  if (channel === 'hashnode') return 'https://hashnode.com/draft/new';
  if (channel === 'indie_hackers') return 'https://www.indiehackers.com/post';
  throw new Error('Unsupported channel');
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
    return (CHANNEL_HOSTS[payload.channel] || []).some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function validDirectoryPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.requestId || typeof payload.requestId !== 'string') return false;
  const directory = DIRECTORY_CATALOG?.byId(payload.directoryId);
  if (!directory) return false;
  const kit = payload.launchKit;
  if (!kit || typeof kit !== 'object') return false;
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
    if (kit[key] !== undefined && typeof kit[key] !== 'string') return false;
    if (String(kit[key] || '').length > limit) return false;
  }
  const required = ['productName', 'productUrl', 'tagline', 'shortDescription'];
  if (required.some((key) => !String(kit[key] || '').trim())) return false;
  try {
    const url = new URL(kit.productUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
  } catch {
    return false;
  }
  for (const key of ['founderUrl', 'twitterUrl', 'linkedinUrl', 'demoUrl']) {
    const value = String(kit[key] || '').trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return false;
    } catch {
      return false;
    }
  }
  for (const key of ['categories', 'tags']) {
    if (kit[key] !== undefined && !Array.isArray(kit[key])) return false;
    const values = Array.isArray(kit[key]) ? kit[key] : [];
    if (values.length > (key === 'categories' ? 5 : 10)) return false;
    if (values.some((value) => typeof value !== 'string' || value.length > 80)) {
      return false;
    }
  }
  const assets = Array.isArray(kit.assets) ? kit.assets : [];
  if (assets.length > 6) return false;
  let assetSize = 0;
  for (const asset of assets) {
    if (!asset || typeof asset !== 'object') return false;
    if (!['logo', 'screenshot'].includes(asset.kind)) return false;
    if (typeof asset.dataUrl !== 'string' || !asset.dataUrl.startsWith('data:image/')) {
      return false;
    }
    assetSize += asset.dataUrl.length;
  }
  return assetSize <= 7_000_000;
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

async function readJobs() {
  const stored = await chrome.storage.local.get('nowbuildActiveJobs');
  return stored.nowbuildActiveJobs || {};
}

async function writeJobs(jobs) {
  await chrome.storage.local.set({ nowbuildActiveJobs: jobs });
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
      options: claimed.options,
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
  const jobs = await readJobs();
  if (jobs[payload.requestId]) throw new Error('This request has already been used');

  const targetTab = await chrome.tabs.create({
    url: payload.postUrl,
    active: false,
  });
  if (!targetTab.id) throw new Error('Failed to open the post');

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
  if (!validDirectoryPayload(request.payload)) {
    throw new Error('Invalid directory submission request');
  }
  const payload = request.payload;
  const directory = DIRECTORY_CATALOG.byId(payload.directoryId);
  const jobs = await readJobs();
  if (jobs[payload.requestId]) throw new Error('This request has already been used');

  const targetTab = await chrome.tabs.create({
    url: directory.submitUrl,
    active: true,
  });
  if (!targetTab.id) throw new Error('Failed to open the directory submission page');

  const job = {
    kind: 'directory',
    requestId: payload.requestId,
    channel: 'directory',
    directoryId: payload.directoryId,
    launchKit: payload.launchKit,
    clientType: isTrustedExtensionPage(sender) ? 'extension' : 'web',
    webTabId: sender.tab?.id,
    targetTabId: targetTab.id,
    mode: 'dry_run',
    options: payload.options || {},
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
          ({ id, name, pricing, entryStage }) => ({ id, name, pricing, entryStage })
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
      await sendToClient(next, {
        status: isPreparedDryRun ? 'prepared' : request.status,
        message: isPreparedDryRun
          ? `Dry Run 已完成填写。请检查${job.kind === 'directory' ? '目录表单' : '平台页面'}后直接关闭标签页，不要点击最终${job.kind === 'directory' ? '提交' : '发布'}。${
              request.adapterVersion ? ` · ${request.adapterVersion}` : ''
            }`
          : request.message,
        postUrl: request.postUrl,
        error: request.error,
        metrics: request.metrics,
        threadCount: request.threadCount,
        weightedLength: request.weightedLength,
        adapterVersion: request.adapterVersion,
        expectedLength: request.expectedLength,
        actualLength: request.actualLength,
        directoryResult: request.directoryResult,
      });

      if (request.status === 'navigating' || request.status === 'needs_user_action') {
        await updateJob(next, { startedAt: null });
        return;
      }

      if (isPreparedDryRun) {
        await removeJob(job.requestId);
        return;
      }

      if (request.status === 'published') {
        await removeJob(job.requestId);
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
            : job.kind === 'directory'
              ? '目录提交页面已关闭，Dry Run 没有完成'
              : '发布页面已关闭，任务没有确认完成',
      });
      await removeJob(job.requestId);
      await focusWebTab(job.webTabId);
    }
  })();
});
