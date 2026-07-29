(function installNowBuildDirectoryRecorder() {
  const catalog = globalThis.NowBuildDirectoryCatalog;
  const directory = catalog?.byHost(window.location.hostname);
  if (!directory || window.__nowbuildDirectoryRecorderInstalled) return;
  window.__nowbuildDirectoryRecorderInstalled = true;

  let session = null;
  let kit = null;
  let panel = null;
  let stageActionCount = 0;

  const normalize = (value) =>
    String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function stageKey() {
    const canonicalPath = window.location.pathname
      .replace(/\/edit\/waiting-line\/[^/]+/i, '/edit/waiting-line/:id')
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,
        '/:id'
      );
    return `${window.location.hostname}${canonicalPath}`;
  }

  function controlLabel(element) {
    const values = [
      element.name,
      element.id,
      element.placeholder,
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('data-placeholder'),
      element.closest?.('label')?.textContent,
    ];
    if (element.id) {
      values.push(document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent);
    }
    return normalize(values.filter(Boolean).join(' ')).slice(0, 240);
  }

  function uploadContext(element) {
    const values = [controlLabel(element)];
    let current = element.parentElement;
    for (let depth = 0; current && depth < 4; depth += 1) {
      values.push(current.innerText?.slice(0, 300));
      current = current.parentElement;
    }
    return normalize(values.filter(Boolean).join(' '));
  }

  function assetSpec(kind) {
    return directory.assetSpecs?.[kind] || null;
  }

  async function transformedBlob(blob, spec) {
    if (!spec || typeof createImageBitmap !== 'function') return blob;
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

  async function assetToFile(asset, kind) {
    const response = await fetch(asset.dataUrl);
    const sourceBlob = await response.blob();
    const spec = assetSpec(kind);
    const blob = await transformedBlob(sourceBlob, spec);
    const type = spec?.type || asset.type || blob.type || 'image/png';
    const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
    const baseName = String(asset.name || 'nowbuild-asset').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${extension}`, {
      type,
      lastModified: Date.now(),
    });
  }

  async function fillAssetsFromLaunchKit() {
    const assets = Array.isArray(kit?.assets) ? kit.assets : [];
    const logo = assets.find((asset) => asset.kind === 'logo');
    const screenshots = assets.filter((asset) => asset.kind === 'screenshot');
    const inputs = [...document.querySelectorAll('input[type="file"]')].filter(
      (input) => !input.disabled
    );
    if (!assets.length) {
      updatePanel('No Logo or screenshots in this Launch Kit.');
      return;
    }
    if (!inputs.length) {
      updatePanel('No file upload field found on this page.');
      return;
    }

    let screenshotIndex = 0;
    let uploaded = 0;
    for (const [index, input] of inputs.entries()) {
      const context = uploadContext(input);
      const wantsLogo =
        /logo|icon|avatar|brand/.test(context) ||
        (index === 0 && Boolean(logo));
      const kind = wantsLogo ? 'logo' : 'screenshot';
      const spec = assetSpec(kind);
      let selected = wantsLogo
        ? logo
          ? [logo]
          : []
        : input.multiple
          ? screenshots
          : screenshots.slice(screenshotIndex, screenshotIndex + 1);
      if (spec?.maxCount) selected = selected.slice(0, spec.maxCount);
      if (!selected.length) continue;
      const transfer = new DataTransfer();
      for (const asset of selected) {
        transfer.items.add(
          await assetToFile(asset, kind)
        );
      }
      input.files = transfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (!wantsLogo) screenshotIndex += selected.length;
      uploaded += selected.length;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    updatePanel(
      uploaded
        ? `Filled ${uploaded} Launch Kit image${uploaded > 1 ? 's' : ''}.`
        : 'This page has upload fields, but no matching Launch Kit assets.'
    );
  }

  function stableSelector(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const testId = element.getAttribute?.('data-testid');
    if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
    if (element.name) {
      return `${element.tagName.toLowerCase()}[name="${CSS.escape(element.name)}"]`;
    }
    const aria = element.getAttribute?.('aria-label');
    if (aria) return `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(aria)}"]`;
    const parts = [];
    let current = element;
    while (current && current !== document.body && parts.length < 4) {
      let part = current.tagName.toLowerCase();
      const siblings = current.parentElement
        ? [...current.parentElement.children].filter((item) => item.tagName === current.tagName)
        : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function inferKitKey(element) {
    const value = normalize(
      element.value || (element.isContentEditable ? element.innerText : '')
    );
    const entries = Object.entries(kit || {}).filter(
      ([, candidate]) => typeof candidate === 'string' && normalize(candidate)
    );
    const exact = entries.find(([, candidate]) => normalize(candidate) === value);
    if (exact) return exact[0];

    const label = controlLabel(element);
    const rules = [
      ['productName', /product name|startup name|tool name|project name/],
      ['productUrl', /product url|website url|website address|startup url/],
      ['tagline', /tagline|slogan|headline|one.?liner/],
      ['shortDescription', /short description|summary|brief description/],
      ['longDescription', /long description|full description|product description|describe your/],
      ['founderEmail', /contact email|email/],
      ['founderName', /founder name|maker name|your name/],
      ['founderUrl', /founder url|maker url|personal website/],
      ['twitterUrl', /twitter|x profile|x url/],
      ['linkedinUrl', /linkedin/],
      ['demoUrl', /demo|video|youtube|walkthrough/],
      ['launchDate', /launch date|release date/],
      ['pricing', /pricing|price|business model/],
      ['categories', /category|categories|industry|topic/],
      ['tags', /tag|keyword/],
    ];
    return rules.find(([, pattern]) => pattern.test(label))?.[0] || null;
  }

  function classifyClick(element) {
    const text = normalize(
      `${element.textContent || ''} ${element.getAttribute?.('aria-label') || ''}`
    );
    const pageText = normalize(document.body?.innerText).slice(0, 6000);
    if (
      /log in|login|sign in|continue with google|google|already have an account/.test(text)
    ) {
      return 'login';
    }
    if (
      directory.id === 'uneed' &&
      window.location.pathname === '/submit-a-tool' &&
      /preview my product|submit your product/.test(text)
    ) {
      return 'navigation';
    }
    if (/^save\b|save your product|update product/.test(text)) return 'save';
    if (
      /submit|publish|launch product|send for review|finish submission/.test(text) &&
      (
        /\b(?:step\s*)?1\s*(?:\/|of)\s*[2-9]\b/.test(pageText) ||
        /\b1\s+details\b.*\b2\s+(?:payment|details)\b.*\b3\s+publish\b/.test(
          pageText
        )
      )
    ) {
      return 'navigation';
    }
    if (/submit|publish|launch product|send for review|finish submission/.test(text)) {
      return 'final';
    }
    if (/next|continue|proceed|start|add product|submit a tool|create listing/.test(text)) {
      return 'navigation';
    }
    return 'interaction';
  }

  function record(action) {
    if (!session) return;
    stageActionCount += 1;
    updatePanel();
    chrome.runtime.sendMessage({
      type: 'NOWBUILD_DIRECTORY_RECORD_ACTION',
      requestId: session.requestId,
      directoryId: directory.id,
      stage: {
        key: stageKey(),
        url: window.location.href,
        title: document.title,
      },
      action: {
        ...action,
        at: Date.now(),
      },
    });
  }

  function updatePanel(message) {
    if (!panel) return;
    panel.querySelector('[data-role="status"]').textContent =
      message || `Recording this page · ${stageActionCount} actions`;
  }

  function createPanel() {
    panel = document.createElement('aside');
    panel.id = 'nowbuild-directory-recorder';
    panel.style.cssText =
      'position:fixed;right:18px;bottom:18px;z-index:2147483647;width:290px;padding:14px;border:1px solid #b7f23a;border-radius:14px;background:#080a0b;color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 12px 40px #0006';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:7px">
        <img src="${chrome.runtime.getURL('assets/nowbuild-logo-32.png')}" width="28" height="28" alt="">
        <strong style="font-size:14px">NowBuild Flow Recorder</strong>
      </div>
      <div data-role="status" style="color:#c8ccd0;margin-bottom:10px"></div>
      <div style="color:#92979d;font-size:12px;margin-bottom:10px">Login yourself. Passwords and typed values are never saved. Your clicks on this site are real.</div>
      <div style="display:flex;gap:8px">
        <button data-role="assets" style="flex:1;padding:8px;border:0;border-radius:8px;cursor:pointer">Fill assets</button>
        <button data-role="stage" style="flex:1;padding:8px;border:0;border-radius:8px;cursor:pointer">Save stage</button>
        <button data-role="finish" style="flex:1;padding:8px;border:0;border-radius:8px;background:#b7f23a;cursor:pointer">Finish</button>
      </div>`;
    document.documentElement.append(panel);
    panel.querySelector('[data-role="assets"]').addEventListener('click', (event) => {
      event.stopPropagation();
      void fillAssetsFromLaunchKit();
    });
    panel.querySelector('[data-role="stage"]').addEventListener('click', (event) => {
      event.stopPropagation();
      record({ type: 'stage_complete' });
      updatePanel('Stage saved. Continue to the next page.');
    });
    panel.querySelector('[data-role="finish"]').addEventListener('click', (event) => {
      event.stopPropagation();
      chrome.runtime.sendMessage({
        type: 'NOWBUILD_DIRECTORY_RECORD_FINISH',
        requestId: session.requestId,
        directoryId: directory.id,
      });
      panel.remove();
      panel = null;
      session = null;
    });
    updatePanel();
  }

  document.addEventListener(
    'change',
    (event) => {
      if (!session || panel?.contains(event.target)) return;
      const element = event.target;
      if (!(element instanceof HTMLElement)) return;
      if (element instanceof HTMLInputElement && element.type === 'password') return;
      if (element instanceof HTMLInputElement && element.type === 'file') {
        const label = controlLabel(element);
        record({
          type: 'upload',
          assetKind: /logo|icon|avatar|brand/.test(label) ? 'logo' : 'screenshot',
          selector: stableSelector(element),
          label,
        });
        return;
      }
      if (
        element.matches('input, textarea, select, [contenteditable="true"]')
      ) {
        record({
          type: element instanceof HTMLSelectElement ? 'select' : 'fill',
          kitKey: inferKitKey(element),
          selector: stableSelector(element),
          label: controlLabel(element),
        });
      }
    },
    true
  );

  document.addEventListener(
    'click',
    (event) => {
      if (!session || panel?.contains(event.target)) return;
      const element = event.target.closest?.(
        'button, a, [role="button"], input[type="submit"], input[type="button"]'
      );
      if (!element) return;
      record({
        type: 'click',
        safety: classifyClick(element),
        selector: stableSelector(element),
        text: normalize(element.textContent || element.value).slice(0, 120),
      });
    },
    true
  );

  chrome.runtime.sendMessage(
    {
      type: 'NOWBUILD_DIRECTORY_RECORDER_HELLO',
      directoryId: directory.id,
      pageUrl: window.location.href,
    },
    (response) => {
      if (!response?.active) return;
      session = { requestId: response.requestId };
      kit = response.launchKit || {};
      stageActionCount = response.stageActionCount || 0;
      createPanel();
    }
  );
})();
