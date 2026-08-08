const directoryRuntime = globalThis.NowBuildChannelRuntime;
const directoryCatalog = globalThis.NowBuildDirectoryCatalog;
const directoryAdapter = directoryCatalog?.byHost(window.location.hostname);
let activeDirectoryRequest = null;

const FIELD_SELECTORS = {
  peerpush: {
    productUrl: 'input[placeholder="https://yourproduct.com"]',
  },
  openhunts: {
    productUrl: 'input[placeholder="https://your-website.com"]',
  },
  earlyhunt: {
    productUrl: 'input[placeholder="https://your-ai-project.com"]',
    productName: 'input[placeholder="e.g. AI Content Generator"]',
    tagline: 'input[placeholder="A catchy one-line title for your AI project"]',
  },
  findly_tools: {
    productName: 'input[placeholder="My Awesome Tool"]',
    productUrl:
      'input[placeholder="https://yourtool.com"], input[placeholder*="yourtool.com"]',
  },
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
  toolpilot: {
    productName: '#input_30',
    productUrl: '#input_34',
    tagline: '#input_32',
    shortDescription: '#input_33',
    longDescription: '#input_43',
    founderEmail: '#input_6',
    twitterUrl: '#input_99',
    linkedinUrl: '#input_104',
  },
  indiehub: {
    logo: '#dropzone-file-icon',
    screenshot: '#dropzone-file-image',
  },
  stellar_launch: {
    logo: '#s3-upload-logo',
    screenshot: '#s3-upload-product',
  },
  launchy: {
    screenshot: '#thumbnail',
  },
};

function emitDirectory(status, detail = {}) {
  if (!activeDirectoryRequest || !directoryAdapter) return;
  chrome.runtime.sendMessage({
    type: 'NOWBUILD_CHANNEL_EVENT',
    requestId: activeDirectoryRequest.requestId,
    status,
    adapterVersion: `${directoryAdapter.id}-directory-0.9.15`,
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
    companyName: String(kit.companyName || kit.productName || '').trim(),
    featureHighlights: directoryRuntime.uniqueTags(kit.featureHighlights, 10),
    supportedPlatforms: directoryRuntime.uniqueTags(kit.supportedPlatforms, 10),
    integrations: directoryRuntime.uniqueTags(kit.integrations, 10),
    techStack: directoryRuntime.uniqueTags(kit.techStack, 10),
    productStage: String(kit.productStage || '').trim(),
    apiAvailability: String(kit.apiAvailability || '').trim(),
    communityAvailability: String(kit.communityAvailability || '').trim(),
    backlinkUrl: String(kit.backlinkUrl || '').trim(),
    pricing: String(kit.pricing || '').trim(),
    founderName: String(kit.founderName || '').trim(),
    founderEmail: String(kit.founderEmail || '').trim(),
    founderUrl: String(kit.founderUrl || '').trim(),
    twitterUrl: String(kit.twitterUrl || '').trim(),
    linkedinUrl: String(kit.linkedinUrl || '').trim(),
    githubUrl: String(kit.githubUrl || '').trim(),
    discordUrl: String(kit.discordUrl || '').trim(),
    youtubeUrl: String(kit.youtubeUrl || '').trim(),
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
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
      values.push(document.getElementById(id)?.textContent);
    }
  }
  values.push(element.closest('label')?.textContent);

  // Walk ancestors so wrapped controls (e.g. shadcn FormItem > relative > input)
  // still pick up the sibling "Tool Name" / "Logo" label text.
  let ancestor = element.parentElement;
  for (let depth = 0; depth < 5 && ancestor && ancestor !== document.body; depth += 1) {
    const childControls = [...ancestor.querySelectorAll(
      'input:not([type="hidden"]), textarea, select, [contenteditable="true"]'
    )];
    if (!childControls.includes(element) || childControls.length !== 1) {
      ancestor = ancestor.parentElement;
      continue;
    }
    const labelText = ancestor.querySelector('label')?.textContent;
    const siblingTexts = [];
    for (const child of ancestor.children) {
      if (child === element || child.contains(element)) continue;
      if (!/^(LABEL|P|SPAN|LEGEND|DIV|H[1-6])$/i.test(child.tagName)) continue;
      const text = directoryRuntime.normalizeText(child.textContent);
      if (text && text.length <= 80) siblingTexts.push(text);
    }
    if (labelText || siblingTexts.length) {
      values.push(labelText, ...siblingTexts);
      break;
    }
    ancestor = ancestor.parentElement;
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
  if (
    /sign in to your account|sign in to continue|welcome back|continue with google|login with google/i.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

function googleLoginButton() {
  return directoryRuntime.byText(
    ['button', 'a', '[role="button"]'],
    /^(?:google|(?:.*\s)?(?:continue|login|log in|sign in)\s+with\s+google(?:\s.*)?)$/i
  );
}

async function enterGoogleLogin() {
  const button = googleLoginButton();
  if (!button) return false;
  emitDirectory('navigating', {
    message: `正在使用浏览器里的 Google 会话登录 ${directoryAdapter.name}`,
    directoryResult: { stage: 'google_login', loginMethod: 'google' },
  });
  directoryRuntime.click(button);
  return true;
}

async function enterDynamicSubmissionSurface() {
  const stage = String(directoryAdapter.entryStage || '');
  if (!/dynamic|modal/.test(stage) || editableControls().length) return false;
  const patterns = [
    /^add startup$/i,
    /^add application$/i,
    /^submit startup$/i,
    /^submit resource$/i,
    /^launch project$/i,
    /^add your product stack$/i,
    /^add product$/i,
    /^submit (?:a |your )?(?:product|tool|project)$/i,
  ];
  const candidates = directoryRuntime
    .queryAll('button, a, [role="button"]')
    .filter(directoryRuntime.visible)
    .filter((element) => {
      const text = directoryRuntime.normalizeText(element.textContent);
      return patterns.some((pattern) => pattern.test(text));
    });
  if (candidates.length !== 1) return false;
  emitDirectory('navigating', {
    message: `正在进入 ${directoryAdapter.name} 的产品提交表单`,
    directoryResult: {
      stage: 'submission_entry',
      action: directoryRuntime.normalizeText(candidates[0].textContent),
    },
  });
  directoryRuntime.click(candidates[0]);
  await directoryRuntime.sleep(600);
  return true;
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

async function prepareEarlyHuntWizard() {
  if (directoryAdapter.id !== 'earlyhunt') return false;
  const text = directoryRuntime.normalizeText(document.body?.innerText);
  if (!/choose your launch plan/i.test(text)) return false;
  const nofollow = directoryRuntime.byText(
    ['h1', 'h2', 'h3', 'label', 'button', '[role="button"]'],
    /^nofollow launch$/i
  );
  const next = directoryRuntime.byText(['button'], /^next$/i);
  if (!nofollow || !next) {
    throw new Error('EarlyHunt 发布方案页面已变化，未找到 Nofollow Launch 或 Next');
  }
  emitDirectory('filling', {
    message: '正在选择 EarlyHunt 无需官网徽章的 Nofollow Launch',
  });
  directoryRuntime.click(nofollow);
  await directoryRuntime.sleep(250);
  directoryRuntime.click(next);
  await directoryRuntime.sleep(900);
  return true;
}

async function siteAutofill(kit) {
  if (directoryAdapter.id === 'toolpilot') {
    const nameParts = kit.founderName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || kit.founderName || kit.productName;
    const lastName = nameParts.join(' ') || '-';
    const extras = [
      ['#first_5', firstName, 'Founder first name'],
      ['#last_5', lastName, 'Founder last name'],
      ['#input_19', kit.companyName || kit.productName, 'Company'],
    ];
    for (const [selector, value, label] of extras) {
      const input = document.querySelector(selector);
      if (input && value) await fillControl(input, value, label);
    }
    const featureValues = directoryRuntime
      .uniqueTags(
        kit.featureHighlights.length
          ? kit.featureHighlights
          : [...kit.categories, ...kit.tags],
        5
      )
      .map((value) => value.trim())
      .filter(Boolean);
    for (const [index, selector] of [
      '#input_46',
      '#input_49',
      '#input_50',
      '#input_51',
      '#input_52',
    ].entries()) {
      const input = document.querySelector(selector);
      if (input && featureValues[index]) {
        await fillControl(input, featureValues[index], `Feature ${index + 1}`);
      }
    }
    const webBased = document.querySelector('#input_39_7');
    if (webBased && !webBased.checked) webBased.click();
    const pricing = kit.pricing.toLowerCase();
    const pricingInput = document.querySelector(
      /free|freemium/.test(pricing) ? '#input_54_0' : '#input_54_1'
    );
    if (pricingInput && !pricingInput.checked) pricingInput.click();
    const monthly = document.querySelector(
      'input[name="q55_billingOptions[]"][value="Monthly"]'
    );
    if (monthly && !monthly.checked && !/free/.test(pricing)) monthly.click();
    const lowestPrice = document.querySelector('#input_73');
    if (lowestPrice && !lowestPrice.value) {
      await fillControl(
        lowestPrice,
        /free/.test(pricing) ? '0' : '1',
        'Lowest price'
      );
    }
    await fillToolpilotWidgetTags(kit.tags);
  }
  const config = {
    peerpush: {
      placeholder: 'https://yourproduct.com',
      button: /^autofill with ai$/i,
      timeout: 35000,
    },
    openhunts: {
      placeholder: 'https://your-website.com',
      button: /^auto-fill$/i,
      timeout: 35000,
    },
    foundrlist: {
      placeholder: 'e.g. https://example.com',
      button: /^prefill with ai$/i,
      timeout: 35000,
      readySelector: 'input[placeholder="e.g. Acme AI"]',
    },
  }[directoryAdapter.id];
  if (!config) return null;
  const urlInput = directoryRuntime.firstVisible([
    `input[placeholder="${config.placeholder}"]`,
  ]);
  const button = directoryRuntime.byText(['button'], config.button);
  if (!urlInput || !button) return null;
  if (!directoryRuntime.normalizeText(urlInput.value)) {
    await directoryRuntime.fill(urlInput, kit.productUrl, { label: '产品网址' });
  }
  emitDirectory('filling', {
    message: `正在使用 ${directoryAdapter.name} 的网址自动预填`,
  });
  directoryRuntime.click(button);
  await directoryRuntime.waitFor(
    () => {
      if (config.readySelector) {
        const ready = document.querySelector(config.readySelector);
        if (directoryRuntime.normalizeText(ready?.value)) return true;
      }
      const controls = editableControls();
      return controls.some((control) => {
        const label = controlLabel(control);
        return (
          /product name|project name|name of/i.test(label) &&
          directoryRuntime.normalizeText(control.value || control.innerText)
        );
      });
    },
    `${directoryAdapter.name} 网址自动预填超时`,
    config.timeout
  );
  return { used: true };
}

function waitForWidgetResult(requestId, timeout = 10000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, timeout);
    function onMessage(event) {
      if (
        !['https://app-widgets.jotform.io', 'https://widgets.jotform.io'].includes(
          event.origin
        ) ||
        event.data?.type !== 'NOWBUILD_JOTFORM_WIDGET_RESULT' ||
        event.data?.requestId !== requestId
      ) {
        return;
      }
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(event.data);
    }
    window.addEventListener('message', onMessage);
  });
}

async function sendToJotformWidget(selector, payload) {
  const frame = document.querySelector(selector);
  if (!frame?.contentWindow || !frame.src) return null;
  const requestId = crypto.randomUUID();
  const result = waitForWidgetResult(requestId);
  frame.contentWindow.postMessage(
    {
      type: 'NOWBUILD_JOTFORM_WIDGET_ACTION',
      requestId,
      ...payload,
    },
    new URL(frame.src).origin
  );
  return result;
}

async function fillToolpilotWidgetTags(tags) {
  if (directoryAdapter.id !== 'toolpilot' || !tags?.length) return null;
  return sendToJotformWidget('#customFieldFrame_35', {
    action: 'fill_tags',
    tags: tags.slice(0, 10),
  });
}

async function uploadToolpilotWidgetLogo(kit) {
  if (directoryAdapter.id !== 'toolpilot') return [];
  const logo = kit.assets.find((asset) => asset.kind === 'logo');
  if (!logo?.dataUrl) return [];
  const result = await sendToJotformWidget('#customFieldFrame_15', {
    action: 'upload_image',
    asset: {
      dataUrl: logo.dataUrl,
      name: logo.name || 'logo.png',
      type: logo.type || 'image/png',
    },
    spec: { width: 500, height: 500, type: 'image/jpeg', quality: 0.9 },
  });
  return result?.ok ? [{ kind: 'logo', name: result.name || logo.name }] : [];
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function chooseCustomCategory(
  candidates,
  { triggerPattern = /select a category/i, maxSelections = 1 } = {}
) {
  const selected = [];
  const trigger =
    directoryRuntime.byText(
      ['button', '[role="combobox"]', '[role="button"]'],
      triggerPattern
    ) || directoryRuntime.firstVisible(['[role="combobox"]']);
  if (!trigger || !candidates.length) return selected;
  directoryRuntime.click(trigger);
  await directoryRuntime.sleep(200);
  for (const candidate of candidates) {
    if (selected.length >= maxSelections) break;
    const exact = new RegExp(`^${escapeRegExp(candidate)}$`, 'i');
    const fuzzy = new RegExp(escapeRegExp(candidate), 'i');
    const option =
      directoryRuntime.byText(
        ['[role="option"]', '[data-radix-collection-item]', 'button', '[role="menuitem"]'],
        exact
      ) ||
      directoryRuntime.byText(
        ['[role="option"]', '[data-radix-collection-item]', 'button', '[role="menuitem"]'],
        fuzzy
      );
    if (!option) continue;
    directoryRuntime.click(option);
    selected.push(`category:${candidate}`);
    await directoryRuntime.sleep(120);
    if (maxSelections > 1 && selected.length < maxSelections) {
      // Re-open multi-select menus that close after each pick.
      const stillOpen = directoryRuntime.firstVisible([
        '[role="listbox"]',
        '[role="option"]',
        '[data-radix-collection-item]',
      ]);
      if (!stillOpen) {
        directoryRuntime.click(trigger);
        await directoryRuntime.sleep(150);
      }
    }
  }
  return selected;
}

async function chooseSiteSpecificOptions(kit) {
  const selected = [];
  if (directoryAdapter.id === 'earlyhunt') {
    selected.push(
      ...(await chooseCustomCategory([...kit.categories, ...kit.tags].slice(0, 3), {
        maxSelections: 3,
      }))
    );
    const pricing = directoryRuntime.byText(
      ['label', 'span', 'div'],
      new RegExp(`^${escapeRegExp(kit.pricing)}$`, 'i')
    );
    if (pricing) {
      directoryRuntime.click(pricing);
      selected.push(`pricing:${kit.pricing}`);
    }
  }
  if (directoryAdapter.id === 'findly_tools') {
    selected.push(
      ...(await chooseCustomCategory([...kit.categories, ...kit.tags].slice(0, 8), {
        maxSelections: 1,
      }))
    );
  }
  return selected;
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

function assetSpecForInput(input, kind) {
  return directoryAdapter.assetSpecs?.[kind] || null;
}

async function transformedAssetBlob(blob, spec) {
  if (!spec?.width || !spec?.height || typeof createImageBitmap !== 'function') {
    return blob;
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const context = canvas.getContext('2d');
    const scale = Math.max(
      spec.width / bitmap.width,
      spec.height / bitmap.height
    );
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(
      bitmap,
      (spec.width - width) / 2,
      (spec.height - height) / 2,
      width,
      height
    );
    bitmap.close();
    let result = await new Promise((resolve) =>
      canvas.toBlob(
        (result) => resolve(result || blob),
        spec.type || blob.type,
        spec.quality
      )
    );
    if (
      spec.maxBytes &&
      result.size > spec.maxBytes &&
      ['image/jpeg', 'image/webp'].includes(spec.type)
    ) {
      for (const quality of [0.78, 0.68, 0.58, 0.48]) {
        result = await new Promise((resolve) =>
          canvas.toBlob(
            (candidate) => resolve(candidate || result),
            spec.type,
            quality
          )
        );
        if (result.size <= spec.maxBytes) break;
      }
    }
    return result;
  } catch {
    return blob;
  }
}

async function assetToFile(asset, spec = null) {
  const response = await fetch(asset.dataUrl);
  const sourceBlob = await response.blob();
  const blob = await transformedAssetBlob(sourceBlob, spec);
  const type = spec?.type || asset.type || blob.type || 'image/png';
  const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
  const baseName = String(asset.name || 'asset').replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.${extension}`, {
    type,
    lastModified: Date.now(),
  });
}

async function uploadAssets(kit) {
  let inputs = directoryRuntime
    .queryAll('input[type="file"]')
    .filter((input) => !input.disabled);
  const logoSelector = FIELD_SELECTORS[directoryAdapter.id]?.logo;
  const screenshotSelector = FIELD_SELECTORS[directoryAdapter.id]?.screenshot;
  const logoInput = logoSelector ? document.querySelector(logoSelector) : null;
  const screenshotInput = screenshotSelector
    ? document.querySelector(screenshotSelector)
    : null;
  for (const preferred of [screenshotInput, logoInput]) {
    if (preferred && !inputs.includes(preferred)) inputs.unshift(preferred);
  }
  const widgetUploads = await uploadToolpilotWidgetLogo(kit);
  if (!inputs.length || !kit.assets.length) return widgetUploads;

  const uploaded = [...widgetUploads];
  const logos = kit.assets.filter((asset) => asset.kind === 'logo');
  const screenshots = kit.assets.filter((asset) => asset.kind === 'screenshot');
  let screenshotIndex = 0;
  for (const input of inputs) {
    const label = controlLabel(input);
    const wantsLogo = input === logoInput || /logo|icon|avatar|brand/.test(label);
    const wantsScreenshot =
      input === screenshotInput ||
      /screenshot|thumbnail|cover|product image|preview|app image|gallery|media/.test(
        label
      );
    // Prefer logo for the first unmatched file input when a logo asset exists;
    // Findly's "App Image" must not steal the only screenshot from Logo.
    const kind = wantsLogo
      ? 'logo'
      : wantsScreenshot
        ? 'screenshot'
        : !screenshotIndex && logos.length && !uploaded.some((item) => item.kind === 'logo')
          ? 'logo'
          : 'screenshot';
    const spec = assetSpecForInput(input, kind);
    let selected = kind === 'logo'
      ? logos.slice(0, 1)
      : input.multiple && wantsScreenshot
        ? screenshots
        : screenshots.slice(screenshotIndex, screenshotIndex + 1);
    if (spec?.maxCount) selected = selected.slice(0, spec.maxCount);
    if (!selected.length) continue;
    const transfer = new DataTransfer();
    const preparedFiles = [];
    for (const asset of selected) {
      const file = await assetToFile(asset, spec);
      transfer.items.add(file);
      preparedFiles.push({
        kind,
        name: file.name,
        type: file.type,
        size: file.size,
        width: spec?.width,
        height: spec?.height,
      });
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    uploaded.push(...preparedFiles);
    if (kind !== 'logo') screenshotIndex += selected.length;
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

function safeWizardStage() {
  const stage = String(directoryAdapter.entryStage || '');
  return /wizard|typeform|details_then_plan|external_wizard/.test(stage);
}

function safeWizardButton() {
  if (!safeWizardStage()) return null;
  const pageText = directoryRuntime
    .normalizeText(document.body?.innerText)
    .toLowerCase();
  const progress = pageText.match(/\b(\d+)\s*(?:\/|of)\s*(\d+)\b/);
  if (progress && Number(progress[1]) >= Number(progress[2])) return null;
  if (
    /choose (?:your )?plan|payment|checkout|billing|select premium|pay £|pay \$/.test(
      pageText
    ) &&
    editableControls().length < 2
  ) {
    return null;
  }
  const patterns = [
    /^(?:next|continue|ok|preview|review|save and continue|continue to details)$/i,
  ];
  if (
    directoryAdapter.id === 'indiehub' &&
    progress &&
    Number(progress[1]) < Number(progress[2])
  ) {
    patterns.push(/^submit$/i);
  }
  const candidates = directoryRuntime
    .queryAll('button, [role="button"], input[type="button"]')
    .filter(directoryRuntime.visible)
    .filter((element) => {
      const text = directoryRuntime.normalizeText(
        element.textContent || element.value
      );
      return (
        patterns.some((pattern) => pattern.test(text)) &&
        !/submit free|submit for review|publish|pay|checkout|create account|premium/i.test(
          text
        )
      );
    });
  return candidates.length === 1 ? candidates[0] : null;
}

async function advanceSafeWizard(request, missingRequired) {
  if (missingRequired.length) return false;
  const button = safeWizardButton();
  if (!button) return false;
  const signature = [
    window.location.pathname,
    directoryRuntime.normalizeText(document.querySelector('h1,h2')?.textContent),
    directoryRuntime.normalizeText(button.textContent || button.value),
  ].join('|');
  if (window.__nowbuildLastSafeDirectoryAdvance === signature) return false;
  window.__nowbuildLastSafeDirectoryAdvance = signature;
  emitDirectory('navigating', {
    message: `当前阶段已填写，正在安全进入 ${directoryAdapter.name} 下一步`,
    directoryResult: {
      stage: 'safe_navigation',
      action: directoryRuntime.normalizeText(button.textContent || button.value),
    },
  });
  directoryRuntime.click(button);
  await directoryRuntime.sleep(1200);
  if (document.documentElement?.isConnected) {
    void startDirectory(request);
  }
  return true;
}

async function learnedFlowForCurrentPage() {
  const stored = await chrome.storage.local.get('nowbuildDirectoryFlows');
  const flow = stored.nowbuildDirectoryFlows?.[directoryAdapter.id];
  if (!flow?.stages?.length) return null;
  const canonicalPath = window.location.pathname
    .replace(/\/edit\/waiting-line\/[^/]+/i, '/edit/waiting-line/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id');
  const key = `${window.location.hostname}${canonicalPath}`;
  return {
    flow,
    stage: flow.stages.find((item) => item.key === key) || null,
  };
}

function learnedValue(kit, key) {
  if (!key) return '';
  if (Array.isArray(kit[key])) return (kit[key] || []).join(', ');
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
  for (const asset of selected) {
    transfer.items.add(await assetToFile(asset, assetSpecForInput(control, kind)));
  }
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
  let finalAction = null;
  let loginAction = null;
  const navigationActions = learned.stage.actions.filter(
    (action) => action.type === 'click' && action.safety === 'navigation'
  );
  let navigationIndex = 0;

  emitDirectory('filling', {
    message: `正在执行已学习的 Stage ${learned.stage.order + 1} · ${learned.stage.actions.length} 个动作`,
  });

  for (const action of learned.stage.actions) {
    if (action.type === 'stage_complete') continue;
    if (action.type === 'click') {
      if (action.safety === 'final') finalAction = action;
      if (action.safety === 'login') loginAction = action;
      if (!['navigation', 'interaction', 'save'].includes(action.safety)) continue;
      if (action.safety !== 'navigation') {
        let safeControl = null;
        try {
          safeControl = action.selector && document.querySelector(action.selector);
        } catch {
          safeControl = null;
        }
        if (!safeControl || !directoryRuntime.visible(safeControl)) {
          missingActions.push(action.text || action.selector || action.safety);
          continue;
        }
        directoryRuntime.click(safeControl);
        await directoryRuntime.sleep(action.safety === 'save' ? 900 : 450);
        continue;
      }
      navigationIndex += 1;
      if (missingActions.length) continue;
      let button = null;
      try {
        button = action.selector && document.querySelector(action.selector);
      } catch {
        button = null;
      }
      if (!button || !directoryRuntime.visible(button)) {
        missingActions.push(action.text || action.selector || 'navigation');
        continue;
      }
      const isLastNavigation = navigationIndex === navigationActions.length;
      emitDirectory('navigating', {
        message: isLastNavigation
          ? `Stage ${learned.stage.order + 1} 已填写，正在进入下一页`
          : `正在执行 Stage ${learned.stage.order + 1} 的同页步骤 ${navigationIndex} / ${navigationActions.length}`,
        directoryResult: {
          stage: learned.stage.order + 1,
          step: navigationIndex,
          totalSteps: navigationActions.length,
          filledFields: filled,
          uploadedAssets,
        },
      });
      directoryRuntime.click(button);
      if (isLastNavigation) return { navigating: true };
      await directoryRuntime.sleep(1200);
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

  return {
    navigating: false,
    filled,
    uploadedAssets,
    missingActions,
    finalAction,
    loginAction: Boolean(loginAction),
    stageNumber: learned.stage.order + 1,
    totalStages: learned.flow.stages.length,
  };
}

function autoSubmitAuthorized(request) {
  return (
    request.options?.allowFinalSubmit === true &&
    request.options?.mode === 'live' &&
    directoryAdapter.submissionPolicy === 'auto_submit_opt_in' &&
    directoryAdapter.pricing === 'Free' &&
    !directoryAdapter.blocker
  );
}

function finalSubmitControl(action = null) {
  if (action?.selector) {
    try {
      const learned = document.querySelector(action.selector);
      if (
        learned &&
        directoryRuntime.visible(learned) &&
        !learned.disabled
      ) {
        return learned;
      }
    } catch {
      // Fall through to the strict text matcher.
    }
  }
  const finalPattern =
    /^(?:submit(?: tool| product| listing)?(?: for review)?|send for review|launch product)$/i;
  const candidates = directoryRuntime
    .queryAll('button, input[type="submit"], [role="button"]')
    .filter(directoryRuntime.visible)
    .filter((element) => !element.disabled)
    .filter((element) =>
      finalPattern.test(
        directoryRuntime.normalizeText(element.textContent || element.value)
      )
    );
  return candidates.length === 1 ? candidates[0] : null;
}

function submissionConfirmed(startUrl) {
  const pageText = directoryRuntime
    .normalizeText(document.body?.innerText)
    .toLowerCase();
  if (
    /thank you for (?:your )?submission|successfully submitted|submission (?:has been )?received|submitted for review|pending (?:approval|review)|currently under review/.test(
      pageText
    )
  ) {
    return true;
  }
  if (!startUrl || window.location.href === startUrl) return false;
  return !finalSubmitControl();
}

async function attemptSafeFinalSubmit(request, action = null) {
  if (!autoSubmitAuthorized(request)) return false;
  if (captchaBlocker() || requiredFieldBlockers().length) return false;
  const button = finalSubmitControl(action);
  if (!button) return false;
  const pageText = directoryRuntime
    .normalizeText(document.body?.innerText)
    .toLowerCase();
  if (/payment|checkout|billing|credit card|accept (?:the )?terms/.test(pageText)) {
    return false;
  }
  const startUrl = window.location.href;
  emitDirectory('publishing', {
    message: `已获授权，正在向 ${directoryAdapter.name} 提交`,
    directoryResult: {
      directoryId: directoryAdapter.id,
      directoryName: directoryAdapter.name,
      stage: 'final_submit',
      action: directoryRuntime.normalizeText(button.textContent || button.value),
      pageUrl: startUrl,
    },
  });
  directoryRuntime.click(button);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await directoryRuntime.sleep(600);
    if (submissionConfirmed(startUrl)) {
      emitDirectory('published', {
        message: `${directoryAdapter.name} 已接收提交`,
        postUrl: window.location.href,
        postUrlConfidence: 'high',
        directoryResult: {
          directoryId: directoryAdapter.id,
          directoryName: directoryAdapter.name,
          stage: 'submitted',
          pageUrl: window.location.href,
        },
      });
      return true;
    }
  }
  emitDirectory('needs_user_action', {
    message: `${directoryAdapter.name} 已点击提交，但未识别到成功回执，请检查当前页面`,
    directoryResult: {
      directoryId: directoryAdapter.id,
      directoryName: directoryAdapter.name,
      blocker: 'submission_unconfirmed',
      stage: 'submission_verification',
      pageUrl: window.location.href,
    },
  });
  return true;
}

async function fillLaunchKit(kit) {
  const used = new Set();
  const filled = [];
  const assignments = [
    {
      key: 'productName', value: kit.productName, label: '产品名称',
      positive: [/product name|startup name|tool name|website name|project name|your product name|name of|my awesome tool/i],
      negative: [/founder|first name|last name|user|company contact/i],
    },
    {
      key: 'productUrl', value: kit.productUrl, label: '产品网址',
      positive: [/product url|website url|website address|product address|project url|startup url|tool.?s? url|your url|yourtool\.com|website/i],
      negative: [/twitter|linkedin|founder|profile|demo|video|logo|screenshot|app image/i],
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
      key: 'companyName', value: kit.companyName, label: '公司名称',
      positive: [/company name|organization name|business name/i], negative: [/contact/i],
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
      key: 'githubUrl', value: kit.githubUrl, label: 'GitHub URL',
      positive: [/github/i], negative: [/login|sign in/i],
    },
    {
      key: 'discordUrl', value: kit.discordUrl, label: 'Discord URL',
      positive: [/discord/i], negative: [/login|sign in/i],
    },
    {
      key: 'youtubeUrl', value: kit.youtubeUrl, label: 'YouTube URL',
      positive: [/youtube/i], negative: [],
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
      key: 'featureHighlights', value: kit.featureHighlights.join(', '), label: '核心功能',
      positive: [/feature|benefit|capabilit/i], negative: [/image|icon/],
    },
    {
      key: 'supportedPlatforms', value: kit.supportedPlatforms.join(', '), label: '支持平台',
      positive: [/supported platform|available on|platforms/i], negative: [],
    },
    {
      key: 'integrations', value: kit.integrations.join(', '), label: '集成服务',
      positive: [/integration|integrates with/i], negative: [],
    },
    {
      key: 'techStack', value: kit.techStack.join(', '), label: '技术栈',
      positive: [/tech stack|technolog(?:y|ies)|built with/i], negative: [],
    },
    {
      key: 'apiAvailability', value: kit.apiAvailability, label: 'API 可用性',
      positive: [/api availab|has api|api access/i], negative: [],
    },
    {
      key: 'communityAvailability', value: kit.communityAvailability, label: '社区可用性',
      positive: [/community availab|has community/i], negative: [],
    },
    {
      key: 'backlinkUrl', value: kit.backlinkUrl, label: '反向链接页面',
      positive: [/backlink url|badge url|where.*badge|proof.*backlink/i], negative: [],
    },
    {
      key: 'productStage', value: kit.productStage, label: '产品阶段',
      positive: [/product stage|startup stage|development stage/i], negative: [],
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
  filled.push(...(await chooseSiteSpecificOptions(kit)));
  return { filled, uploadedAssets };
}

async function fillFirstProfile(kit) {
  const controls = editableControls();
  const profileControls = controls.filter((control) =>
    /first name|last name|full name|professional headline|brief bio|about me|handle|username/i.test(
      controlLabel(control)
    )
  );
  if (!profileControls.length) return null;

  const nameParts = kit.founderName.split(/\s+/).filter(Boolean);
  const firstName = nameParts.shift() || '';
  const lastName = nameParts.join(' ');
  const handleSource =
    kit.twitterUrl.split('/').filter(Boolean).pop() ||
    kit.founderEmail.split('@')[0] ||
    '';
  const handle = handleSource.replace(/^@/, '').replace(/[^a-z0-9_]/gi, '').slice(0, 20);
  const values = [
    [/first name/i, firstName],
    [/last name/i, lastName],
    [/full name/i, kit.founderName],
    [/professional headline|headline/i, kit.tagline || `Founder of ${kit.productName}`],
    [/brief bio|about me|bio/i, kit.shortDescription],
    [/handle|username/i, handle],
  ];
  const filled = [];
  for (const control of profileControls) {
    const label = controlLabel(control);
    const match = values.find(([pattern, value]) => value && pattern.test(label));
    if (!match) continue;
    if (await fillControl(control, match[1], '首次 Profile')) filled.push(label);
  }
  return filled;
}

async function startDirectory(request) {
  activeDirectoryRequest = request;
  const kit = normalizedKit(request);
  try {
    if (request.options?.verifySubmission) {
      await directoryRuntime.sleep(800);
      if (submissionConfirmed(request.options.submissionStartUrl)) {
        emitDirectory('published', {
          message: `${directoryAdapter.name} 已接收提交`,
          postUrl: window.location.href,
          postUrlConfidence: 'high',
          directoryResult: {
            directoryId: directoryAdapter.id,
            directoryName: directoryAdapter.name,
            stage: 'submitted',
            pageUrl: window.location.href,
          },
        });
      } else {
        emitDirectory('needs_user_action', {
          message: `${directoryAdapter.name} 已点击提交，但未识别到成功回执，请检查当前页面`,
          directoryResult: {
            directoryId: directoryAdapter.id,
            directoryName: directoryAdapter.name,
            blocker: 'submission_unconfirmed',
            stage: 'submission_verification',
            pageUrl: window.location.href,
          },
        });
      }
      return;
    }
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
      if (await enterGoogleLogin()) return;
      emitDirectory('needs_user_action', {
        message: `请先在当前标签页登录 ${directoryAdapter.name}；返回提交页后插件会继续`,
        directoryResult: { blocker: 'login', stage: 'before_form' },
      });
      return;
    }
    const pageText = document.body?.innerText || '';
    if (
      /add the badge before submitting|verify badge|backlink to our site is required/i.test(
        pageText
      )
    ) {
      emitDirectory('needs_user_action', {
        message: `${directoryAdapter.name} 要求先在官网添加指定徽章或反向链接；完成并验证后，返回 NowBuild 点击“我已完成，继续录制”`,
        directoryResult: {
          blocker: 'site_requirement',
          stage: 'badge_verification',
          pageUrl: window.location.href,
        },
      });
      return;
    }
    if (
      /get verified to launch|you can.?t interact yet|complete .?basic details.? and 40% of your profile/i.test(
        pageText
      )
    ) {
      emitDirectory('needs_user_action', {
        message: `${directoryAdapter.name} 要求先完成公开资料或账号验证；完成后返回 NowBuild 点击“我已完成，继续录制”`,
        directoryResult: {
          blocker: 'profile_verification',
          stage: 'profile_gate',
          pageUrl: window.location.href,
        },
      });
      return;
    }
    if (directoryAdapter.id === 'toolfolio' && /choose your submission type/i.test(document.body?.innerText || '')) {
      emitDirectory('needs_user_action', {
        message: 'Toolfio 免费方案要求 DR 5+ 和官网永久徽章；请选择是否自行满足条件或改用付费方案',
        directoryResult: {
          blocker: 'site_requirement',
          stage: 'plan_gate',
          blockerDetail: directoryAdapter.blocker,
          pageUrl: window.location.href,
        },
      });
      return;
    }
    if (
      directoryAdapter.entryStage === 'profile_gate'
    ) {
      const profileFields = await fillFirstProfile(kit);
      if (profileFields?.length) {
        emitDirectory('needs_user_action', {
          message: `已自动填写 ${directoryAdapter.name} 首次 Profile；请检查并保存，完成后返回 NowBuild 点击“我已完成，继续录制”`,
          directoryResult: {
            blocker: 'profile_setup',
            stage: 'profile_gate',
            filled: profileFields,
            pageUrl: window.location.href,
          },
        });
        return;
      }
    }
    if (
      ['plan_gate', 'dynamic_launch_gate', 'account_gate', 'bot_gate', 'paid_package_gate', 'manual_only'].includes(
        directoryAdapter.entryStage
      )
    ) {
      emitDirectory('needs_user_action', {
        message:
          directoryAdapter.blocker ||
          `${directoryAdapter.name} 需要先完成人工准备步骤`,
        directoryResult: {
          blocker:
            directoryAdapter.entryStage === 'plan_gate'
                ? 'site_requirement'
                : directoryAdapter.entryStage === 'account_gate'
                  ? 'login'
                  : directoryAdapter.entryStage === 'bot_gate'
                    ? 'anti_bot'
                    : directoryAdapter.entryStage === 'paid_package_gate'
                      ? 'payment_required'
                      : directoryAdapter.entryStage === 'manual_only'
                        ? 'manual_only'
                : 'dynamic_flow',
          stage: directoryAdapter.entryStage,
          blockerDetail: directoryAdapter.blocker || null,
          pageUrl: window.location.href,
        },
      });
      return;
    }
    if (
      directoryAdapter.id === 'uneed' &&
      /one launch at a time|already have a product in the waiting line/i.test(
        document.body?.innerText || ''
      )
    ) {
      emitDirectory('needs_user_action', {
        message: 'Uneed 免费账号已有一个 waiting-line 产品；请先在 Manage my products 中处理该草稿',
        directoryResult: {
          blocker: 'existing_waiting_product',
          stage: 'before_form',
          pageUrl: window.location.href,
        },
      });
      return;
    }

    const learnedResult = await replayLearnedStage(kit);
    if (learnedResult?.navigating) return;
    if (learnedResult) {
      const missingRequired = requiredFieldBlockers();
      if (
        !learnedResult.loginAction &&
        !learnedResult.missingActions.length &&
        !missingRequired.length &&
        learnedResult.finalAction &&
        (await attemptSafeFinalSubmit(request, learnedResult.finalAction))
      ) {
        return;
      }
      emitDirectory('awaiting_user', {
        message: learnedResult.loginAction
          ? `已完成登录前步骤，请你登录 ${directoryAdapter.name} 后继续`
          : learnedResult.finalAction
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
            learnedResult.loginAction
              ? 'login'
              : learnedResult.missingActions.length || missingRequired.length
              ? 'manual_fields'
              : learnedResult.finalAction
                ? 'final_confirmation'
                : null,
          pageUrl: window.location.href,
        },
      });
      return;
    }

    await prepareEarlyHuntWizard();
    await enterSafeFreePlan();
    await enterDynamicSubmissionSurface();
    const singleControlStage =
      directoryAdapter.entryStage === 'external_typeform' ||
      /dynamic/.test(String(directoryAdapter.entryStage || ''));
    const requiredControlCount = singleControlStage ? 1 : 2;
    const controls = await directoryRuntime.waitFor(
      () =>
        editableControls().length >= requiredControlCount && editableControls(),
      `等待 ${directoryAdapter.name} 提交表单超时`,
      35000
    );
    emitDirectory('filling', {
      message: `已识别 ${controls.length} 个可填写字段，正在映射 Launch Kit`,
    });
    await siteAutofill(kit);
    const result = await fillLaunchKit(kit);
    const minimumFilled =
      directoryAdapter.entryStage === 'url_preview' || singleControlStage ? 1 : 2;
    if (result.filled.length < minimumFilled) {
      throw new Error(
        `${directoryAdapter.name} 页面已打开，但只匹配到 ${result.filled.length} 个 Launch Kit 字段`
      );
    }
    const missingRequired = requiredFieldBlockers();
    if (await advanceSafeWizard(request, missingRequired)) return;
    if (
      !missingRequired.length &&
      !captchaBlocker() &&
      (await attemptSafeFinalSubmit(request))
    ) {
      return;
    }
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
