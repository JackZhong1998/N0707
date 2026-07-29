const directoryRuntime = globalThis.NowBuildChannelRuntime;
const directoryCatalog = globalThis.NowBuildDirectoryCatalog;
const directoryAdapter = directoryCatalog?.byHost(window.location.hostname);
let activeDirectoryRequest = null;

const FIELD_SELECTORS = {
  twelve_tools: {
    productUrl: '#iURL',
    productName: '#iName',
    tagline: '#iDesc',
    longDescription: '#iLongDesc',
    founderEmail: '#iMail',
    category: '#iCateg1',
    logo: '#imageUpload',
  },
  uneed: {
    productUrl: 'input[name="url"]',
    productName: 'input[name="name"], input[name="slug"]',
  },
};

function emitDirectory(status, detail = {}) {
  if (!activeDirectoryRequest || !directoryAdapter) return;
  chrome.runtime.sendMessage({
    type: 'NOWBUILD_CHANNEL_EVENT',
    requestId: activeDirectoryRequest.requestId,
    status,
    adapterVersion: `${directoryAdapter.id}-directory-0.7.0`,
    ...detail,
  });
}

function normalizedKit(request) {
  const kit = request.launchKit || {};
  return {
    productName: String(kit.productName || '').trim(),
    productUrl: String(kit.productUrl || '').trim(),
    tagline: String(kit.tagline || '').trim(),
    shortDescription: String(kit.shortDescription || '').trim(),
    longDescription: String(kit.longDescription || '').trim(),
    categories: directoryRuntime.uniqueTags(kit.categories, 5),
    tags: directoryRuntime.uniqueTags(kit.tags, 10),
    pricing: String(kit.pricing || '').trim(),
    founderName: String(kit.founderName || '').trim(),
    founderEmail: String(kit.founderEmail || '').trim(),
    founderUrl: String(kit.founderUrl || '').trim(),
    twitterUrl: String(kit.twitterUrl || '').trim(),
    linkedinUrl: String(kit.linkedinUrl || '').trim(),
    demoUrl: String(kit.demoUrl || '').trim(),
    launchDate: String(kit.launchDate || '').trim(),
    assets: Array.isArray(kit.assets) ? kit.assets : [],
  };
}

function isFormControl(element) {
  if (!directoryRuntime.visible(element)) return false;
  if (element.disabled || element.readOnly) return false;
  const type = String(element.type || '').toLowerCase();
  return !['hidden', 'submit', 'button', 'reset', 'password', 'checkbox', 'radio', 'file'].includes(type);
}

function controlLabel(element) {
  const values = [
    element.name,
    element.id,
    element.placeholder,
    element.getAttribute('aria-label'),
    element.getAttribute('data-placeholder'),
    element.getAttribute('autocomplete'),
  ];
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    values.push(label?.textContent);
  }
  values.push(element.closest('label')?.textContent);
  const parent = element.parentElement;
  if (parent?.querySelectorAll('input, textarea, select, [contenteditable="true"]').length === 1) {
    values.push(parent.querySelector('label')?.textContent);
    values.push(parent.textContent?.slice(0, 180));
  }
  return directoryRuntime.normalizeText(values.filter(Boolean).join(' ')).toLowerCase();
}

function editableControls() {
  return directoryRuntime
    .queryAll('input, textarea, select, [contenteditable="true"]')
    .filter(isFormControl);
}

function findControl(positive, negative = [], used = new Set()) {
  const candidates = editableControls().filter((element) => !used.has(element));
  return candidates.find((element) => {
    const label = controlLabel(element);
    return (
      positive.some((pattern) => pattern.test(label)) &&
      !negative.some((pattern) => pattern.test(label))
    );
  });
}

function loginBlocker() {
  const path = window.location.pathname.toLowerCase();
  const text = directoryRuntime.normalizeText(document.body?.innerText);
  if (/auth|sign-in|signin|login/.test(path)) return true;
  if (/sign in to your account|welcome back|continue with google|login with google/i.test(text)) {
    return true;
  }
  return false;
}

function captchaBlocker() {
  const text = directoryRuntime.normalizeText(document.body?.innerText);
  return (
    Boolean(document.querySelector('iframe[src*="captcha" i], [class*="captcha" i], [id*="captcha" i]')) ||
    /verify you are human|captcha|cloudflare verification/i.test(text)
  );
}

function safePlanButton() {
  if (!directoryAdapter.safePlanPattern) return null;
  const pattern = new RegExp(directoryAdapter.safePlanPattern, 'i');
  return directoryRuntime.byText(['button', 'a', '[role="button"]'], pattern);
}

async function enterSafeFreePlan() {
  if (directoryAdapter.entryStage !== 'plan_then_form') return false;
  if (editableControls().length >= 2) return false;
  const button = await directoryRuntime.waitFor(
    safePlanButton,
    `${directoryAdapter.name} 没有找到免费方案入口`,
    20000
  );
  emitDirectory('navigating', {
    message: `正在进入 ${directoryAdapter.name} 免费方案资料页`,
    directoryResult: { stage: 'plan_selected', plan: 'free' },
  });
  directoryRuntime.click(button);
  await directoryRuntime.sleep(1400);
  return true;
}

async function fillControl(element, value, label) {
  if (!element || !value) return false;
  if (element instanceof HTMLSelectElement) return false;
  await directoryRuntime.fill(element, value, { label });
  return true;
}

function chooseNativeSelect(element, candidates) {
  if (!(element instanceof HTMLSelectElement) || !candidates.length) return null;
  const options = [...element.options];
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    const option = options.find((item) => {
      const text = `${item.textContent || ''} ${item.value || ''}`.toLowerCase();
      return text === normalized || text.includes(normalized) || normalized.includes(text);
    });
    if (!option) continue;
    element.value = option.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return option.textContent?.trim() || option.value;
  }
  return null;
}

async function assetToFile(asset) {
  const response = await fetch(asset.dataUrl);
  const blob = await response.blob();
  return new File([blob], asset.name || 'asset.png', {
    type: asset.type || blob.type || 'image/png',
    lastModified: Date.now(),
  });
}

async function uploadAssets(kit) {
  let inputs = directoryRuntime
    .queryAll('input[type="file"]')
    .filter(directoryRuntime.visible)
    .filter((input) => !input.disabled);
  const logoSelector = FIELD_SELECTORS[directoryAdapter.id]?.logo;
  const logoInput = logoSelector ? document.querySelector(logoSelector) : null;
  if (logoInput && !inputs.includes(logoInput)) inputs = [logoInput, ...inputs];
  if (!inputs.length || !kit.assets.length) return [];

  const uploaded = [];
  const logos = kit.assets.filter((asset) => asset.kind === 'logo');
  const screenshots = kit.assets.filter((asset) => asset.kind === 'screenshot');
  for (const input of inputs) {
    const label = controlLabel(input);
    const wantsLogo = input === logoInput || /logo|icon|avatar|brand/.test(label);
    const selected = wantsLogo
      ? logos.slice(0, 1)
      : input.multiple
        ? screenshots
        : screenshots.slice(uploaded.some((item) => item.kind === 'screenshot') ? 1 : 0, 1);
    if (!selected.length) continue;
    const transfer = new DataTransfer();
    for (const asset of selected) transfer.items.add(await assetToFile(asset));
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    uploaded.push(...selected.map((asset) => ({ kind: asset.kind, name: asset.name })));
    await directoryRuntime.sleep(400);
  }
  return uploaded;
}

function requiredFieldBlockers() {
  return directoryRuntime
    .queryAll('input[required], textarea[required], select[required], [aria-required="true"]')
    .filter(directoryRuntime.visible)
    .filter((element) => {
      if (element instanceof HTMLSelectElement) return !element.value;
      if (element.type === 'checkbox' || element.type === 'radio') return !element.checked;
      if (element.type === 'file') return !element.files?.length;
      return !directoryRuntime.normalizeText(
        element.value || element.innerText || element.textContent
      );
    })
    .map((element) => controlLabel(element).slice(0, 100) || element.tagName.toLowerCase());
}

async function learnedFlowForCurrentPage() {
  const stored = await chrome.storage.local.get('nowbuildDirectoryFlows');
  const flow = stored.nowbuildDirectoryFlows?.[directoryAdapter.id];
  if (!flow?.stages?.length) return null;
  const key = `${window.location.hostname}${window.location.pathname}`;
  return {
    flow,
    stage: flow.stages.find((item) => item.key === key) || null,
  };
}

function learnedValue(kit, key) {
  if (!key) return '';
  if (key === 'categories' || key === 'tags') return (kit[key] || []).join(', ');
  return String(kit[key] || '');
}

function learnedControl(action) {
  try {
    const direct = action.selector && document.querySelector(action.selector);
    if (direct && directoryRuntime.visible(direct)) return direct;
  } catch {
    // A site may have changed an invalid selector since the flow was recorded.
  }
  if (!action.label) return null;
  return editableControls().find((element) => {
    const label = controlLabel(element);
    return label.includes(action.label) || action.label.includes(label);
  }) || null;
}

async function uploadLearnedAsset(control, kit, kind) {
  if (!(control instanceof HTMLInputElement) || control.type !== 'file') return null;
  const candidates = kit.assets.filter((asset) => asset.kind === kind);
  const selected = control.multiple ? candidates : candidates.slice(0, 1);
  if (!selected.length) return null;
  const transfer = new DataTransfer();
  for (const asset of selected) transfer.items.add(await assetToFile(asset));
  control.files = transfer.files;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
  await directoryRuntime.sleep(350);
  return selected.map((asset) => ({ kind: asset.kind, name: asset.name }));
}

async function replayLearnedStage(kit) {
  const learned = await learnedFlowForCurrentPage();
  if (!learned?.stage) return null;
  const filled = [];
  const uploadedAssets = [];
  const missingActions = [];
  let navigationAction = null;
  let finalAction = null;

  emitDirectory('filling', {
    message: `正在执行已学习的 Stage ${learned.stage.order + 1} · ${learned.stage.actions.length} 个动作`,
  });

  for (const action of learned.stage.actions) {
    if (action.type === 'stage_complete') continue;
    if (action.type === 'click') {
      if (action.safety === 'navigation') navigationAction = action;
      if (action.safety === 'final') finalAction = action;
      continue;
    }
    const control = learnedControl(action);
    if (!control) {
      missingActions.push(action.kitKey || action.label || action.selector);
      continue;
    }
    if (action.type === 'upload') {
      const uploaded = await uploadLearnedAsset(control, kit, action.assetKind);
      if (uploaded) uploadedAssets.push(...uploaded);
      continue;
    }
    const value = learnedValue(kit, action.kitKey);
    if (!value) {
      missingActions.push(action.kitKey || action.label);
      continue;
    }
    if (control instanceof HTMLSelectElement) {
      const selected = chooseNativeSelect(
        control,
        action.kitKey === 'categories' || action.kitKey === 'tags'
          ? kit[action.kitKey]
          : [value]
      );
      if (selected) filled.push(`${action.kitKey}:${selected}`);
      else missingActions.push(action.kitKey);
    } else {
      await fillControl(control, value, action.kitKey || action.label || '字段');
      filled.push(action.kitKey);
    }
  }

  if (navigationAction && !finalAction && !missingActions.length) {
    let button = null;
    try {
      button = document.querySelector(navigationAction.selector);
    } catch {
      button = null;
    }
    if (button && directoryRuntime.visible(button)) {
      emitDirectory('navigating', {
        message: `Stage ${learned.stage.order + 1} 已填写，正在进入下一页`,
        directoryResult: {
          stage: learned.stage.order + 1,
          filledFields: filled,
          uploadedAssets,
        },
      });
      await directoryRuntime.sleep(500);
      directoryRuntime.click(button);
      return { navigating: true };
    }
  }

  return {
    navigating: false,
    filled,
    uploadedAssets,
    missingActions,
    finalAction: Boolean(finalAction),
    stageNumber: learned.stage.order + 1,
    totalStages: learned.flow.stages.length,
  };
}

async function fillLaunchKit(kit) {
  const used = new Set();
  const filled = [];
  const assignments = [
    {
      key: 'productName', value: kit.productName, label: '产品名称',
      positive: [/product name|startup name|tool name|website name|project name|your product name|name of/i],
      negative: [/founder|first name|last name|user|company contact/i],
    },
    {
      key: 'productUrl', value: kit.productUrl, label: '产品网址',
      positive: [/product url|website url|website address|product address|project url|startup url|tool.?s? url|your url|website/i],
      negative: [/twitter|linkedin|founder|profile|demo|video|logo|screenshot/i],
    },
    {
      key: 'tagline', value: kit.tagline, label: '一句话介绍',
      positive: [/tagline|slogan|headline|one.?liner|short title|catchphrase/i],
      negative: [/description|bio/i],
    },
    {
      key: 'shortDescription', value: kit.shortDescription, label: '短介绍',
      positive: [/short description|brief description|summary|elevator pitch|short intro/i],
      negative: [/meta|seo/i],
    },
    {
      key: 'longDescription', value: kit.longDescription, label: '详细介绍',
      positive: [/long description|full description|about product|describe your|product description|project description|description/i],
      negative: [/short|meta|seo|founder/i],
    },
    {
      key: 'founderEmail', value: kit.founderEmail, label: '联系邮箱',
      positive: [/email|contact email/i], negative: [/password/i],
    },
    {
      key: 'founderName', value: kit.founderName, label: '创始人姓名',
      positive: [/founder name|maker name|your name|contact name/i], negative: [/product|startup|tool/i],
    },
    {
      key: 'twitterUrl', value: kit.twitterUrl, label: 'Twitter URL',
      positive: [/twitter|x profile|x url/i], negative: [],
    },
    {
      key: 'linkedinUrl', value: kit.linkedinUrl, label: 'LinkedIn URL',
      positive: [/linkedin/i], negative: [],
    },
    {
      key: 'demoUrl', value: kit.demoUrl, label: 'Demo URL',
      positive: [/demo|youtube|video|walkthrough/i], negative: [],
    },
    {
      key: 'founderUrl', value: kit.founderUrl, label: '创始人主页',
      positive: [/founder url|maker url|profile url|personal website/i], negative: [/product/i],
    },
    {
      key: 'launchDate', value: kit.launchDate, label: '发布日期',
      positive: [/launch date|release date|date/i], negative: [],
    },
  ];

  for (const assignment of assignments) {
    if (!assignment.value) continue;
    const directSelector = FIELD_SELECTORS[directoryAdapter.id]?.[assignment.key];
    const control =
      (directSelector && directoryRuntime.firstVisible([directSelector])) ||
      findControl(assignment.positive, assignment.negative, used);
    if (!control) continue;
    if (await fillControl(control, assignment.value, assignment.label)) {
      used.add(control);
      filled.push(assignment.key);
    }
  }

  for (const select of editableControls().filter((item) => item instanceof HTMLSelectElement)) {
    const label = controlLabel(select);
    if (/categor|industry|topic|type/.test(label)) {
      const selected = chooseNativeSelect(select, [...kit.categories, ...kit.tags]);
      if (selected) filled.push(`category:${selected}`);
    } else if (/pricing|price|business model/.test(label)) {
      const selected = chooseNativeSelect(select, [kit.pricing]);
      if (selected) filled.push(`pricing:${selected}`);
    }
  }
  const directCategory = FIELD_SELECTORS[directoryAdapter.id]?.category;
  if (directCategory) {
    const select = directoryRuntime.firstVisible([directCategory]);
    if (select instanceof HTMLSelectElement) {
      const selected = chooseNativeSelect(select, [...kit.categories, ...kit.tags]);
      if (selected && !filled.includes(`category:${selected}`)) {
        filled.push(`category:${selected}`);
      }
    }
  }

  const uploadedAssets = await uploadAssets(kit);
  return { filled, uploadedAssets };
}

async function startDirectory(request) {
  activeDirectoryRequest = request;
  const kit = normalizedKit(request);
  try {
    if (!kit.productName || !kit.productUrl || !kit.tagline || !kit.shortDescription) {
      throw new Error('Launch Kit 至少需要产品名称、网址、Slogan 和短介绍');
    }
    if (request.directoryId !== directoryAdapter.id) {
      throw new Error('目录任务与当前页面不匹配');
    }
    if (captchaBlocker()) {
      emitDirectory('needs_user_action', {
        message: '页面要求完成人机验证；完成后若页面没有自动继续，请在测试台重新执行当前目录',
        directoryResult: { blocker: 'captcha', stage: 'before_form' },
      });
      return;
    }
    if (loginBlocker()) {
      emitDirectory('needs_user_action', {
        message: `请先在当前标签页登录 ${directoryAdapter.name}；返回提交页后插件会继续`,
        directoryResult: { blocker: 'login', stage: 'before_form' },
      });
      return;
    }

    const learnedResult = await replayLearnedStage(kit);
    if (learnedResult?.navigating) return;
    if (learnedResult) {
      const missingRequired = requiredFieldBlockers();
      emitDirectory('awaiting_user', {
        message: learnedResult.finalAction
          ? '已按录制流程填到最终提交前，请检查并由你点击最终按钮'
          : '已完成当前录制阶段的预填；页面变化或未识别字段需要你检查',
        directoryResult: {
          directoryId: directoryAdapter.id,
          directoryName: directoryAdapter.name,
          stage: learnedResult.stageNumber,
          totalStages: learnedResult.totalStages,
          learnedFlow: true,
          filledFields: learnedResult.filled,
          uploadedAssets: learnedResult.uploadedAssets,
          missingActions: learnedResult.missingActions,
          missingRequired,
          blocker:
            learnedResult.missingActions.length || missingRequired.length
              ? 'manual_fields'
              : learnedResult.finalAction
                ? 'final_confirmation'
                : null,
          pageUrl: window.location.href,
        },
      });
      return;
    }

    await enterSafeFreePlan();
    const controls = await directoryRuntime.waitFor(
      () => editableControls().length >= 2 && editableControls(),
      `等待 ${directoryAdapter.name} 提交表单超时`,
      35000
    );
    emitDirectory('filling', {
      message: `已识别 ${controls.length} 个可填写字段，正在映射 Launch Kit`,
    });
    const result = await fillLaunchKit(kit);
    const minimumFilled = directoryAdapter.entryStage === 'url_preview' ? 1 : 2;
    if (result.filled.length < minimumFilled) {
      throw new Error(
        `${directoryAdapter.name} 页面已打开，但只匹配到 ${result.filled.length} 个 Launch Kit 字段`
      );
    }
    const missingRequired = requiredFieldBlockers();
    const blocker = captchaBlocker()
      ? 'captcha'
      : missingRequired.length
        ? 'manual_fields'
        : directoryAdapter.blocker
          ? 'site_requirement'
          : null;
    emitDirectory('awaiting_user', {
      message: blocker
        ? '已填写可自动处理的字段，剩余平台要求需要你检查'
        : 'Launch Kit 已填入目录表单，请检查后决定是否手动提交',
      directoryResult: {
        directoryId: directoryAdapter.id,
        directoryName: directoryAdapter.name,
        stage: directoryAdapter.entryStage,
        filledFields: result.filled,
        uploadedAssets: result.uploadedAssets,
        missingRequired,
        blocker,
        blockerDetail: directoryAdapter.blocker || null,
        pageUrl: window.location.href,
      },
    });
  } catch (error) {
    emitDirectory('failed', {
      error: error?.message || `${directoryAdapter.name} 目录填写失败`,
      directoryResult: {
        directoryId: directoryAdapter.id,
        directoryName: directoryAdapter.name,
        pageUrl: window.location.href,
      },
    });
  }
}

if (directoryAdapter) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request?.type === 'NOWBUILD_DIRECTORY_START') void startDirectory(request);
  });
  chrome.runtime.sendMessage({
    type: 'NOWBUILD_DIRECTORY_READY',
    directoryId: directoryAdapter.id,
  });
}
