const COMMAND_TYPE = 'NOWBUILD_EXTENSION_COMMAND';
const EVENT_TYPE = 'NOWBUILD_EXTENSION_EVENT';
const TERMINAL_STATUSES = new Set([
  'prepared',
  'published',
  'collected',
  'blocked',
  'failed',
  'cancelled',
  'recorded',
]);

const state = {
  currentRequestId: null,
  currentAction: null,
  logs: [],
  result: {},
  startedAt: null,
  directoryAssets: [],
};

const elements = {
  runtimeDot: document.getElementById('runtime-dot'),
  runtimeLabel: document.getElementById('runtime-label'),
  runtimeVersion: document.getElementById('runtime-version'),
  publishForm: document.getElementById('publish-form'),
  publishChannel: document.getElementById('publish-channel'),
  publishTitle: document.getElementById('publish-title'),
  publishBody: document.getElementById('publish-body'),
  publishHashtags: document.getElementById('publish-hashtags'),
  publishUrl: document.getElementById('publish-url'),
  publishCommunity: document.getElementById('publish-community'),
  urlField: document.getElementById('url-field'),
  urlHelp: document.getElementById('url-help'),
  communityField: document.getElementById('community-field'),
  xSettings: document.getElementById('x-settings'),
  xAccountType: document.getElementById('x-account-type'),
  threadPreview: document.getElementById('thread-preview'),
  threadPreviewTitle: document.getElementById('thread-preview-title'),
  threadPreviewDetail: document.getElementById('thread-preview-detail'),
  loadThreadSample: document.getElementById('load-thread-sample'),
  publishButton: document.getElementById('publish-button'),
  platformNotice: document.getElementById('platform-notice'),
  titleLabel: document.getElementById('title-label'),
  metricsForm: document.getElementById('metrics-form'),
  metricsChannel: document.getElementById('metrics-channel'),
  metricsUrl: document.getElementById('metrics-url'),
  metricsButton: document.getElementById('metrics-button'),
  directoryForm: document.getElementById('directory-form'),
  directoryId: document.getElementById('directory-id'),
  directoryButton: document.getElementById('directory-button'),
  directoryNotice: document.getElementById('directory-notice'),
  directoryFlowStatus: document.getElementById('directory-flow-status'),
  recordDirectory: document.getElementById('record-directory'),
  deleteDirectoryFlow: document.getElementById('delete-directory-flow'),
  useNowBuildLogo: document.getElementById('use-nowbuild-logo'),
  assetSummary: document.getElementById('asset-summary'),
  kitProductName: document.getElementById('kit-product-name'),
  kitProductUrl: document.getElementById('kit-product-url'),
  kitTagline: document.getElementById('kit-tagline'),
  kitShortDescription: document.getElementById('kit-short-description'),
  kitLongDescription: document.getElementById('kit-long-description'),
  kitCategories: document.getElementById('kit-categories'),
  kitTags: document.getElementById('kit-tags'),
  kitPricing: document.getElementById('kit-pricing'),
  kitFounderName: document.getElementById('kit-founder-name'),
  kitFounderEmail: document.getElementById('kit-founder-email'),
  kitFounderUrl: document.getElementById('kit-founder-url'),
  kitTwitterUrl: document.getElementById('kit-twitter-url'),
  kitLinkedinUrl: document.getElementById('kit-linkedin-url'),
  kitDemoUrl: document.getElementById('kit-demo-url'),
  kitLaunchDate: document.getElementById('kit-launch-date'),
  kitLogo: document.getElementById('kit-logo'),
  kitScreenshots: document.getElementById('kit-screenshots'),
  cancelTask: document.getElementById('cancel-task'),
  logList: document.getElementById('log-list'),
  resultOutput: document.getElementById('result-output'),
  taskOutput: document.getElementById('task-output'),
};

function nowLabel(timestamp = Date.now()) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false });
}

function addLog(status, message, detail) {
  const entry = {
    at: Date.now(),
    status,
    message: message || '',
    detail,
  };
  state.logs.push(entry);
  renderLogs();
  return entry;
}

function renderLogs() {
  elements.logList.replaceChildren();
  if (state.logs.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-log';
    empty.textContent = '等待执行任务';
    elements.logList.append(empty);
    return;
  }

  for (const entry of state.logs) {
    const item = document.createElement('li');
    const time = document.createElement('span');
    const status = document.createElement('span');
    const message = document.createElement('span');
    time.className = 'log-time';
    status.className = 'log-status';
    message.className = 'log-message';
    time.textContent = nowLabel(entry.at);
    status.textContent = entry.status;
    message.textContent = entry.message || JSON.stringify(entry.detail || {});
    item.append(time, status, message);
    elements.logList.append(item);
  }
  elements.logList.scrollTop = elements.logList.scrollHeight;
}

function buildReport() {
  return {
    generatedAt: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    currentRequestId: state.currentRequestId,
    currentAction: state.currentAction,
    startedAt: state.startedAt,
    result: state.result,
    logs: state.logs,
  };
}

function setResult(value) {
  state.result = value || {};
  elements.resultOutput.textContent = JSON.stringify(buildReport(), null, 2);
}

function setBusy(busy) {
  elements.publishButton.disabled = busy;
  elements.metricsButton.disabled = busy;
  elements.directoryButton.disabled = busy;
  elements.recordDirectory.disabled = busy;
  elements.cancelTask.disabled = !busy || !state.currentRequestId;
}

function finishTask(status, event) {
  setBusy(false);
  setResult({
    requestId: event.requestId,
    action: state.currentAction,
    status,
    completedAt: Date.now(),
    postUrl: event.postUrl,
    metrics: event.metrics,
    threadCount: event.threadCount,
    weightedLength: event.weightedLength,
    adapterVersion: event.adapterVersion,
    expectedLength: event.expectedLength,
    actualLength: event.actualLength,
    blocker: event.blocker,
    directoryResult: event.directoryResult,
    message: event.message,
    error: event.error,
  });
  state.currentRequestId = null;
  state.currentAction = null;
  void refreshTasks();
}

function sendCommand(command, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: COMMAND_TYPE,
        command,
        ...data,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || `${command} failed`));
          return;
        }
        resolve(response);
      }
    );
  });
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked')?.value || 'dry_run';
}

function hashtagsFromInput() {
  return elements.publishHashtags.value
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);
}

function composedXContent() {
  const hashtags = hashtagsFromInput().map((tag) => `#${tag}`).join(' ');
  const text = [elements.publishTitle.value, elements.publishBody.value]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');
  return { text, hashtags };
}

function updateThreadPreview() {
  const isX = elements.publishChannel.value === 'twitter_x';
  elements.xSettings.hidden = !isX;
  elements.loadThreadSample.hidden = !isX;
  if (!isX) return;

  const content = composedXContent();
  const fullText = [content.text, content.hashtags].filter(Boolean).join('\n\n');
  const weightedLength = window.NowBuildXText.weightedLength(fullText);
  const isPremium = elements.xAccountType.value === 'premium';
  const parts = isPremium
    ? [fullText]
    : window.NowBuildXText.splitThreadContent(content.text, content.hashtags, 280);
  const threadCount = Math.max(1, parts.length);
  elements.threadPreviewTitle.textContent =
    threadCount === 1 ? '预计 1 条帖子' : `预计 ${threadCount} 条 Thread`;
  elements.threadPreviewDetail.textContent = isPremium
    ? `${weightedLength} 加权字符 · Premium 长帖模式`
    : `${weightedLength} 加权字符 · 每条不超过 280`;
  elements.threadPreview.classList.toggle('threaded', threadCount > 1);
}

function loadThreadSample() {
  const sample = window.NOWBUILD_TEST_SAMPLES.twitter_x_thread;
  elements.publishChannel.value = 'twitter_x';
  elements.xAccountType.value = 'standard';
  elements.publishTitle.value = sample.title || '';
  elements.publishBody.value = sample.body || '';
  elements.publishHashtags.value = (sample.hashtags || []).join(', ');
  elements.publishUrl.value = '';
  elements.publishCommunity.value = '';
  updatePublishForm();
}

function updatePublishForm() {
  const channel = elements.publishChannel.value;
  const mode = selectedMode();
  const isLive = mode === 'live';
  elements.publishButton.textContent = isLive ? '开始 Live Test' : '开始 Dry Run';
  elements.publishButton.classList.toggle('live', isLive);
  const titleRequired = ['hacker_news', 'devto', 'reddit', 'medium', 'hashnode', 'indie_hackers'].includes(channel);
  elements.titleLabel.textContent =
    channel === 'xiaohongshu'
      ? '笔记标题'
      : titleRequired
        ? '标题（必填）'
        : '标题（可选）';
  elements.publishTitle.required = titleRequired;
  elements.publishBody.required = channel !== 'hacker_news';
  elements.publishTitle.maxLength = channel === 'xiaohongshu' ? 20 : 500;
  elements.urlField.hidden = channel === 'xiaohongshu';
  elements.urlHelp.textContent =
    channel === 'hacker_news'
      ? '填写：标题 + 链接；留空：标题 + 正文'
      : '可选；会追加到正文';
  elements.communityField.hidden = channel !== 'reddit';
  elements.platformNotice.classList.toggle('warning', isLive || channel === 'xiaohongshu');

  if (isLive) {
    elements.platformNotice.textContent = 'Live Test 会在真实账号中准备内容。插件不会替你点击最终发布，必须由你在平台页面确认。';
  } else if (channel === 'xiaohongshu') {
    elements.platformNotice.textContent = 'Dry Run 会自动进入“文字配图”、生成默认封面并填写标题和正文，最终停在发布前供你检查。';
  } else if (channel === 'hacker_news') {
    elements.platformNotice.textContent = 'HN 的链接投稿会只填写标题和 URL，这是标准 link submission；如果要发正文，请清空 URL，插件会改为 text submission。';
  } else if (channel === 'devto') {
    elements.platformNotice.textContent = 'Dry Run 会填写 DEV 的标题、Markdown 正文与最多 4 个标签，停在 Publish 前。';
  } else if (channel === 'reddit') {
    elements.platformNotice.textContent = '建议先填写社区名。Dry Run 会打开该社区的 Text Post 页面并填写标题、正文，停在 Post 前。';
  } else if (channel === 'linkedin') {
    elements.platformNotice.textContent = 'Dry Run 会打开 LinkedIn 发帖框并填写一条不超过 3000 字符的帖子，停在 Post 前。';
  } else if (channel === 'medium') {
    elements.platformNotice.textContent = 'Dry Run 会填写 Medium 新文章；Medium 会自动保存草稿，但插件不会点击最终发布。';
  } else if (channel === 'hashnode') {
    elements.platformNotice.textContent = 'Dry Run 会打开 Hashnode Feed、点击 Write 创建真实草稿，再填写标题和正文。Hashnode 会自动保存草稿。';
  } else if (channel === 'indie_hackers') {
    elements.platformNotice.textContent = 'Dry Run 会打开 Indie Hackers 的 /new-post。若账号尚未获得发帖权限，会返回明确的 account_posting_permission 阻塞状态。';
  } else {
    elements.platformNotice.textContent =
      elements.xAccountType.value === 'standard'
        ? 'Dry Run 会按 X 的加权字符规则自动拆分并填入完整 Thread，停在发布前供你检查。'
        : 'Dry Run 会把完整内容填入一个长帖；只有当前登录的 X 账号已开通 Premium，才能最终发布。';
  }
  updateThreadPreview();
}

function loadSample(channel = elements.publishChannel.value) {
  const sample = window.NOWBUILD_TEST_SAMPLES[channel];
  if (!sample) return;
  elements.publishTitle.value = sample.title || '';
  elements.publishBody.value = sample.body || '';
  elements.publishHashtags.value = (sample.hashtags || []).join(', ');
  elements.publishUrl.value = sample.url || '';
  elements.publishCommunity.value = sample.community || '';
  updateThreadPreview();
}

const LAUNCH_KIT_STORAGE_KEY = 'nowbuildPublisherLaunchKitTextV1';

function commaValues(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function launchKitFromForm({ includeAssets = true } = {}) {
  return {
    productName: elements.kitProductName.value.trim(),
    productUrl: elements.kitProductUrl.value.trim(),
    tagline: elements.kitTagline.value.trim(),
    shortDescription: elements.kitShortDescription.value.trim(),
    longDescription: elements.kitLongDescription.value.trim(),
    categories: commaValues(elements.kitCategories.value),
    tags: commaValues(elements.kitTags.value),
    pricing: elements.kitPricing.value,
    founderName: elements.kitFounderName.value.trim(),
    founderEmail: elements.kitFounderEmail.value.trim(),
    founderUrl: elements.kitFounderUrl.value.trim(),
    twitterUrl: elements.kitTwitterUrl.value.trim(),
    linkedinUrl: elements.kitLinkedinUrl.value.trim(),
    demoUrl: elements.kitDemoUrl.value.trim(),
    launchDate: elements.kitLaunchDate.value,
    assets: includeAssets ? state.directoryAssets : [],
  };
}

function applyLaunchKit(kit = {}) {
  elements.kitProductName.value = kit.productName || '';
  elements.kitProductUrl.value = kit.productUrl || '';
  elements.kitTagline.value = kit.tagline || '';
  elements.kitShortDescription.value = kit.shortDescription || '';
  elements.kitLongDescription.value = kit.longDescription || '';
  elements.kitCategories.value = (kit.categories || []).join(', ');
  elements.kitTags.value = (kit.tags || []).join(', ');
  elements.kitPricing.value = kit.pricing || 'Freemium';
  elements.kitFounderName.value = kit.founderName || '';
  elements.kitFounderEmail.value = kit.founderEmail || '';
  elements.kitFounderUrl.value = kit.founderUrl || '';
  elements.kitTwitterUrl.value = kit.twitterUrl || '';
  elements.kitLinkedinUrl.value = kit.linkedinUrl || '';
  elements.kitDemoUrl.value = kit.demoUrl || '';
  elements.kitLaunchDate.value = kit.launchDate || '';
}

function directorySample() {
  return {
    productName: 'NowBuild',
    productUrl: 'https://nowbuild.ai',
    tagline: 'A 30-day launch system for solo founders',
    shortDescription: 'NowBuild helps solo founders prepare a launch campaign and move channel-specific content into real publishing and directory submission pages.',
    longDescription: 'NowBuild is a 30-day cold-start workspace for solo founders and one-person companies. It turns product context into a launch plan, channel-ready content, and a reusable Product Launch Kit. A local Chrome extension works inside existing signed-in browser sessions, fills real platform forms, validates what was entered, and leaves the final submission decision to the founder.',
    categories: ['Marketing', 'Productivity', 'SaaS'],
    tags: ['launch', 'automation', 'solo founder'],
    pricing: 'Freemium',
    founderName: '',
    founderEmail: '',
    founderUrl: '',
    twitterUrl: '',
    linkedinUrl: '',
    demoUrl: 'https://nowbuild.ai',
    launchDate: '',
  };
}

function updateDirectoryNotice() {
  const directory = window.NowBuildDirectoryCatalog?.byId(elements.directoryId.value);
  if (!directory) {
    elements.directoryNotice.textContent = '没有找到目录配置。';
    return;
  }
  elements.directoryNotice.textContent = [
    `${directory.name} · ${directory.pricing} · ${directory.entryStage}`,
    directory.notes,
    directory.blocker ? `已知阻塞：${directory.blocker}` : '',
  ].filter(Boolean).join(' ');
  elements.directoryNotice.classList.toggle('warning', Boolean(directory.blocker));
}

function renderAssetSummary() {
  if (!state.directoryAssets.length) {
    elements.assetSummary.textContent = '尚未选择 Logo 或截图';
    return;
  }
  elements.assetSummary.textContent = state.directoryAssets
    .map((asset) => `${asset.kind === 'logo' ? 'Logo' : '截图'}：${asset.name} · ${Math.round(asset.bytes / 1024)}KB`)
    .join(' ｜ ');
}

function fileAsAsset(file, kind) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`${file.name} 不是可用的图片文件`));
      return;
    }
    if (file.size > 1_600_000) {
      reject(new Error(`${file.name} 超过 1.5MB，请先压缩图片`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
    reader.onload = () => resolve({
      kind,
      name: file.name,
      type: file.type,
      bytes: file.size,
      dataUrl: String(reader.result || ''),
    });
    reader.readAsDataURL(file);
  });
}

async function refreshDirectoryAssets() {
  try {
    const logoFiles = [...(elements.kitLogo.files || [])].slice(0, 1);
    const screenshotFiles = [...(elements.kitScreenshots.files || [])].slice(0, 5);
    const assets = [];
    for (const file of logoFiles) assets.push(await fileAsAsset(file, 'logo'));
    for (const file of screenshotFiles) assets.push(await fileAsAsset(file, 'screenshot'));
    const totalBytes = assets.reduce((total, asset) => total + asset.bytes, 0);
    if (totalBytes > 5_200_000) {
      throw new Error('Logo 和截图合计超过约 5MB，请压缩或减少截图');
    }
    state.directoryAssets = assets;
    renderAssetSummary();
  } catch (error) {
    state.directoryAssets = [];
    elements.kitLogo.value = '';
    elements.kitScreenshots.value = '';
    renderAssetSummary();
    addLog('asset_failed', error.message);
  }
}

async function useBundledNowBuildLogo() {
  try {
    const response = await fetch(chrome.runtime.getURL('assets/nowbuild-logo.png'));
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('无法读取内置 Logo'));
      reader.readAsDataURL(blob);
    });
    state.directoryAssets = [
      ...state.directoryAssets.filter((asset) => asset.kind !== 'logo'),
      {
        kind: 'logo',
        name: 'nowbuild-logo.png',
        type: 'image/png',
        bytes: blob.size,
        dataUrl,
      },
    ];
    renderAssetSummary();
    addLog('asset_ready', '已载入内置 NowBuild Logo，可测试目录图片上传');
  } catch (error) {
    addLog('asset_failed', error.message);
  }
}

async function refreshDirectoryFlowStatus() {
  try {
    const response = await sendCommand('GET_DIRECTORY_FLOWS');
    const flow = response.flows?.[elements.directoryId.value];
    if (!flow) {
      elements.directoryFlowStatus.textContent = '这个站点还没有保存的操作流程。';
      return;
    }
    const actions = flow.stages.reduce(
      (total, stage) => total + (stage.actions?.length || 0),
      0
    );
    elements.directoryFlowStatus.textContent =
      `已学习 ${flow.stages.length} 个页面阶段、${actions} 个动作。再次 Dry Run 时会优先使用它。`;
  } catch (error) {
    elements.directoryFlowStatus.textContent = `读取流程失败：${error.message}`;
  }
}

async function startDirectoryRecording() {
  const requestId = crypto.randomUUID();
  const directoryId = elements.directoryId.value;
  const directory = window.NowBuildDirectoryCatalog?.byId(directoryId);
  state.currentRequestId = requestId;
  state.currentAction = 'directory_record';
  state.startedAt = Date.now();
  setBusy(true);
  addLog('created', `开始学习 ${directory?.name || directoryId} 的多页面提交步骤`);
  try {
    const response = await sendCommand('DIRECTORY_RECORD_START', {
      payload: {
        requestId,
        directoryId,
        launchKit: launchKitFromForm(),
        options: { mode: 'record' },
      },
    });
    addLog('accepted', '录制页面已打开；请自行登录并按顺序操作', response);
  } catch (error) {
    addLog('failed', error.message);
    finishTask('failed', { requestId, error: error.message });
  }
}

async function deleteDirectoryFlow() {
  const directoryId = elements.directoryId.value;
  await sendCommand('DELETE_DIRECTORY_FLOW', { directoryId });
  addLog('flow_deleted', `已删除 ${directoryId} 的已学流程`);
  await refreshDirectoryFlowStatus();
}

function saveLaunchKitText() {
  localStorage.setItem(
    LAUNCH_KIT_STORAGE_KEY,
    JSON.stringify(launchKitFromForm({ includeAssets: false }))
  );
  addLog('kit_saved', 'Launch Kit 文字资料已保存在插件测试台；图片不会持久化');
}

function restoreLaunchKitText() {
  try {
    const stored = localStorage.getItem(LAUNCH_KIT_STORAGE_KEY);
    if (stored) applyLaunchKit(JSON.parse(stored));
  } catch {
    localStorage.removeItem(LAUNCH_KIT_STORAGE_KEY);
  }
}

async function startDirectorySubmission(event) {
  event.preventDefault();
  const requestId = crypto.randomUUID();
  const directoryId = elements.directoryId.value;
  const directory = window.NowBuildDirectoryCatalog?.byId(directoryId);
  state.currentRequestId = requestId;
  state.currentAction = 'directory_submit';
  state.startedAt = Date.now();
  setBusy(true);
  addLog('created', `创建 ${directory?.name || directoryId} 目录 Dry Run`, { requestId });

  try {
    const response = await sendCommand('DIRECTORY_SUBMIT', {
      requestId,
      payload: {
        requestId,
        directoryId,
        launchKit: launchKitFromForm(),
        options: { mode: 'dry_run' },
      },
    });
    addLog('accepted', '插件已接受目录填写任务', response);
    await refreshTasks();
  } catch (error) {
    addLog('failed', error.message);
    finishTask('failed', { requestId, error: error.message });
  }
}

async function startPublish(event) {
  event.preventDefault();
  const requestId = crypto.randomUUID();
  const channel = elements.publishChannel.value;
  const mode = selectedMode();
  const hashtags = hashtagsFromInput();

  state.currentRequestId = requestId;
  state.currentAction = 'publish';
  state.startedAt = Date.now();
  setBusy(true);
  addLog('created', `创建 ${channel} ${mode} 任务`, { requestId });

  try {
    const response = await sendCommand('PUBLISH', {
      requestId,
      payload: {
        requestId,
        channel,
        content: {
          title: elements.publishTitle.value.trim(),
          body: elements.publishBody.value.trim(),
          hashtags,
          url: elements.publishUrl.value.trim(),
        },
        options: {
          mode,
          xAccountType: channel === 'twitter_x' ? elements.xAccountType.value : undefined,
          community: channel === 'reddit' ? elements.publishCommunity.value.trim() : undefined,
        },
      },
    });
    addLog('accepted', '插件已接受发布任务', response);
    await refreshTasks();
  } catch (error) {
    addLog('failed', error.message);
    finishTask('failed', { requestId, error: error.message });
  }
}

async function startMetrics(event) {
  event.preventDefault();
  const requestId = crypto.randomUUID();
  const channel = elements.metricsChannel.value;

  state.currentRequestId = requestId;
  state.currentAction = 'collect_metrics';
  state.startedAt = Date.now();
  setBusy(true);
  addLog('created', `创建 ${channel} 数据回收任务`, { requestId });

  try {
    if (channel === 'hashnode') {
      const metricsUrl = new URL(elements.metricsUrl.value.trim());
      const isKnownHashnodeHost =
        metricsUrl.hostname === 'hashnode.com' ||
        metricsUrl.hostname.endsWith('.hashnode.com') ||
        metricsUrl.hostname === 'hashnode.dev' ||
        metricsUrl.hostname.endsWith('.hashnode.dev');
      if (!isKnownHashnodeHost) {
        const granted = await chrome.permissions.request({
          origins: [`${metricsUrl.origin}/*`],
        });
        if (!granted) {
          throw new Error('需要允许插件访问这个 Hashnode 自定义域名，才能读取公开数据');
        }
      }
    }
    const response = await sendCommand('COLLECT_METRICS', {
      requestId,
      payload: {
        requestId,
        channel,
        postUrl: elements.metricsUrl.value.trim(),
      },
    });
    addLog('accepted', '插件已接受数据回收任务', response);
    await refreshTasks();
  } catch (error) {
    addLog('failed', error.message);
    finishTask('failed', { requestId, error: error.message });
  }
}

async function cancelCurrentTask() {
  if (!state.currentRequestId) return;
  const requestId = state.currentRequestId;
  try {
    await sendCommand('CANCEL', { requestId });
    addLog('cancelled', '当前任务已取消');
    finishTask('cancelled', { requestId, message: 'Cancelled from test console' });
  } catch (error) {
    addLog('cancel_failed', error.message);
  }
}

async function refreshTasks() {
  try {
    const response = await sendCommand('GET_TASK_STATE');
    elements.taskOutput.textContent = JSON.stringify(response.tasks || [], null, 2);
  } catch (error) {
    elements.taskOutput.textContent = JSON.stringify({ error: error.message }, null, 2);
  }
}

async function connectRuntime() {
  try {
    const response = await sendCommand('PING');
    elements.runtimeDot.className = 'status-dot ready';
    elements.runtimeLabel.textContent = '插件执行内核已连接';
    elements.runtimeVersion.textContent = `版本 ${response.version} · ${(response.supportedChannels || []).length} 个内容适配器 · ${(response.supportedDirectories || []).length} 个目录适配器`;
    addLog('ready', '插件执行内核已连接', response);
    await refreshTasks();
  } catch (error) {
    elements.runtimeDot.className = 'status-dot error';
    elements.runtimeLabel.textContent = '插件执行内核连接失败';
    elements.runtimeVersion.textContent = error.message;
    addLog('runtime_error', error.message);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== EVENT_TYPE || !message.requestId) return;
  if (state.currentRequestId && message.requestId !== state.currentRequestId) {
    addLog('other_task', `收到其他任务事件 ${message.requestId}`, message);
    return;
  }
  addLog(message.status || 'event', message.error || message.message || '', message);
  if (TERMINAL_STATUSES.has(message.status)) {
    finishTask(message.status, message);
  }
});

document.querySelectorAll('.adapter[data-channel]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.adapter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    elements.publishChannel.value = button.dataset.channel;
    elements.metricsChannel.value = button.dataset.channel;
    updatePublishForm();
    loadSample(button.dataset.channel);
  });
});

elements.publishForm.addEventListener('submit', startPublish);
elements.metricsForm.addEventListener('submit', startMetrics);
elements.directoryForm.addEventListener('submit', startDirectorySubmission);
elements.directoryId.addEventListener('change', () => {
  updateDirectoryNotice();
  void refreshDirectoryFlowStatus();
});
elements.kitLogo.addEventListener('change', refreshDirectoryAssets);
elements.kitScreenshots.addEventListener('change', refreshDirectoryAssets);
elements.publishChannel.addEventListener('change', () => {
  updatePublishForm();
  loadSample();
});
elements.metricsChannel.addEventListener('change', () => {
  const placeholders = {
    twitter_x: 'https://x.com/.../status/...',
    xiaohongshu: 'https://www.xiaohongshu.com/explore/...',
    hacker_news: 'https://news.ycombinator.com/item?id=...',
    devto: 'https://dev.to/username/article-slug',
    reddit: 'https://www.reddit.com/r/.../comments/...',
    linkedin: 'https://www.linkedin.com/posts/...',
    medium: 'https://medium.com/@username/article-...',
    hashnode: 'https://your-hashnode-domain.com/article-slug',
    indie_hackers: 'https://www.indiehackers.com/post/...',
  };
  elements.metricsUrl.placeholder = placeholders[elements.metricsChannel.value] || 'https://...';
});
elements.xAccountType.addEventListener('change', updatePublishForm);
[elements.publishTitle, elements.publishBody, elements.publishHashtags].forEach((input) => {
  input.addEventListener('input', updateThreadPreview);
});
document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener('change', updatePublishForm);
});
document.getElementById('load-sample').addEventListener('click', () => loadSample());
document.getElementById('load-directory-sample').addEventListener('click', () => {
  applyLaunchKit(directorySample());
  addLog('kit_loaded', '已载入 Launch Kit 示例；提交前请替换为真实资料');
});
document.getElementById('save-launch-kit').addEventListener('click', saveLaunchKitText);
elements.useNowBuildLogo.addEventListener('click', useBundledNowBuildLogo);
elements.recordDirectory.addEventListener('click', startDirectoryRecording);
elements.deleteDirectoryFlow.addEventListener('click', deleteDirectoryFlow);
elements.loadThreadSample.addEventListener('click', loadThreadSample);
document.getElementById('refresh-tasks').addEventListener('click', refreshTasks);
document.getElementById('cancel-task').addEventListener('click', cancelCurrentTask);
document.getElementById('clear-log').addEventListener('click', () => {
  state.logs = [];
  renderLogs();
  setResult(state.result);
});
document.getElementById('copy-report').addEventListener('click', async () => {
  await navigator.clipboard.writeText(JSON.stringify(buildReport(), null, 2));
});
document.getElementById('download-report').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(buildReport(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nowbuild-publisher-report-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

for (const directory of window.NowBuildDirectoryCatalog?.directories || []) {
  const option = document.createElement('option');
  option.value = directory.id;
  option.textContent = `${directory.name} · ${directory.pricing}`;
  elements.directoryId.append(option);
}
restoreLaunchKitText();
if (!elements.kitProductName.value) applyLaunchKit(directorySample());
renderAssetSummary();
updateDirectoryNotice();
void useBundledNowBuildLogo();
void refreshDirectoryFlowStatus();
updatePublishForm();
loadSample();
setResult({});
void connectRuntime();
