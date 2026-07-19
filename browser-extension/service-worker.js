const WEB_EVENT_TYPE = 'NOWBUILD_EXTENSION_EVENT';
const WEB_COMMAND_TYPE = 'NOWBUILD_EXTENSION_COMMAND';
const SUPPORTED_CHANNELS = new Set(['twitter_x', 'xiaohongshu']);

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

function publishUrl(channel) {
  if (channel === 'twitter_x') return 'https://x.com/compose/post';
  if (channel === 'xiaohongshu') {
    return 'https://creator.xiaohongshu.com/publish/publish';
  }
  throw new Error('Unsupported channel');
}

function validPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!SUPPORTED_CHANNELS.has(payload.channel)) return false;
  if (!payload.requestId || typeof payload.requestId !== 'string') return false;
  if (!payload.content || typeof payload.content !== 'object') return false;
  const title = String(payload.content.title || '');
  const body = String(payload.content.body || '');
  return title.length <= 500 && body.length <= 20000;
}

function validMetricsPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!SUPPORTED_CHANNELS.has(payload.channel)) return false;
  if (!payload.requestId || typeof payload.requestId !== 'string') return false;
  try {
    const url = new URL(payload.postUrl);
    if (payload.channel === 'twitter_x') {
      return ['x.com', 'twitter.com'].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      );
    }
    return (
      url.hostname === 'xiaohongshu.com' ||
      url.hostname.endsWith('.xiaohongshu.com')
    );
  } catch {
    return false;
  }
}

async function readJobs() {
  const stored = await chrome.storage.local.get('nowbuildActiveJobs');
  return stored.nowbuildActiveJobs || {};
}

async function writeJobs(jobs) {
  await chrome.storage.local.set({ nowbuildActiveJobs: jobs });
}

async function sendToWeb(job, event) {
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
          : 'NOWBUILD_CHANNEL_START',
      requestId: claimed.requestId,
      content: claimed.content,
      postUrl: claimed.postUrl,
    });
    await sendToWeb(claimed, {
      status: claimed.kind === 'metrics' ? 'collecting' : 'filling',
      message:
        claimed.kind === 'metrics' ? '正在读取帖子公开数据' : '正在填写发布内容',
    });
  } catch {
    // The content script may not be ready yet. CHANNEL_READY will retry.
    await updateJob(claimed, { startedAt: null });
  }
}

async function startPublish(request, sender) {
  if (!isAllowedNowBuildPage(sender.tab?.url || '')) {
    throw new Error('Untrusted NowBuild page');
  }
  if (!validPayload(request.payload)) throw new Error('Invalid publish request');

  const payload = request.payload;
  const jobs = await readJobs();
  if (jobs[payload.requestId]) throw new Error('This request has already been used');

  const targetTab = await chrome.tabs.create({
    url: publishUrl(payload.channel),
    active: true,
  });
  if (!targetTab.id) throw new Error('Failed to open the publish page');

  const job = {
    kind: 'publish',
    requestId: payload.requestId,
    channel: payload.channel,
    content: payload.content,
    webTabId: sender.tab.id,
    targetTabId: targetTab.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs[payload.requestId] = job;
  await writeJobs(jobs);
  void dispatchJob(job);
  await sendToWeb(job, {
    status: 'opening',
    message: '发布页面已打开',
  });
  return { accepted: true, requestId: payload.requestId };
}

async function startMetricsCollection(request, sender) {
  if (!isAllowedNowBuildPage(sender.tab?.url || '')) {
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
    webTabId: sender.tab.id,
    targetTabId: targetTab.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs[payload.requestId] = job;
  await writeJobs(jobs);
  void dispatchJob(job);
  await sendToWeb(job, {
    status: 'opening',
    message: '正在打开帖子页面',
  });
  return { accepted: true, requestId: payload.requestId };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type === WEB_COMMAND_TYPE) {
    if (request.command === 'PING') {
      sendResponse({
        ok: true,
        installed: true,
        version: chrome.runtime.getManifest().version,
        supportedChannels: [...SUPPORTED_CHANNELS],
      });
      return false;
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

    if (request.command === 'CANCEL') {
      void (async () => {
        const jobs = await readJobs();
        const job = jobs[request.requestId];
        if (job?.targetTabId) {
          try {
            await chrome.tabs.remove(job.targetTabId);
          } catch {
            // The target tab may already be closed.
          }
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

  if (request?.type === 'NOWBUILD_CHANNEL_EVENT' && sender.tab?.id) {
    void (async () => {
      const job = await findJobByTargetTab(sender.tab.id);
      if (!job || job.requestId !== request.requestId) return;
      const next = await updateJob(job, {
        lastStatus: request.status,
        postUrl: request.postUrl || job.postUrl,
      });
      await sendToWeb(next, {
        status: request.status,
        message: request.message,
        postUrl: request.postUrl,
        error: request.error,
        metrics: request.metrics,
      });
      if (request.status === 'published' || request.status === 'collected') {
        await removeJob(job.requestId);
        if (request.status === 'collected') {
          try {
            await chrome.tabs.remove(sender.tab.id);
          } catch {
            // The collection tab may already be closed.
          }
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
    if (job.lastStatus !== 'published') {
      await sendToWeb(job, {
        status: 'failed',
        error: '发布页面已关闭，任务没有确认完成',
      });
      await removeJob(job.requestId);
    }
  })();
});
