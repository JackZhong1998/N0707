(function installNowBuildGoogleAuthAssistant() {
  if (window.__nowbuildGoogleAuthAssistantInstalled) return;
  window.__nowbuildGoogleAuthAssistantInstalled = true;

  let active = false;
  let completedAction = '';
  let attempts = 0;
  let lastConsentClickAt = 0;
  let lastPageKind = '';

  const LOOP_KEY = 'nowbuild:google-auth-loop';
  const LOOP_LIMIT = 4;

  const visible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.pointerEvents !== 'none' &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const enabled = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    if (element.dataset?.disabled === 'true') return false;
    return true;
  };

  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  function pageText() {
    return normalize(document.body?.innerText).slice(0, 3000);
  }

  function buttonLabel(element) {
    return normalize(
      element.getAttribute('aria-label') ||
        element.getAttribute('value') ||
        element.textContent ||
        ''
    );
  }

  function isConsentActionLabel(text) {
    const value = normalize(text);
    if (!value || value.length > 40) return false;
    // Do not treat account-chooser copy like "继续前往 Product Hunt" as consent.
    if (/继续前往|continue to /i.test(value)) return false;
    return /^(?:continue|allow|同意|继续|允许)(?:\s+(?:continue|allow|同意|继续|允许))?$/i.test(
      value
    );
  }

  function isCancelActionLabel(text) {
    const value = normalize(text);
    if (!value || value.length > 40) return false;
    return /^(?:cancel|deny|不同意|取消|拒绝)(?:\s+(?:cancel|deny|不同意|取消|拒绝))?$/i.test(
      value
    );
  }

  function actionButtons() {
    return [
      ...document.querySelectorAll(
        'button, [role="button"], input[type="submit"], input[type="button"], div[jsname]'
      ),
    ].filter(visible);
  }

  function findConsentButton() {
    const byId = document.querySelector(
      '#submit_approve_access, #confirm_yes, button[name="confirm"]'
    );
    if (byId && visible(byId) && enabled(byId)) return byId;

    const buttons = actionButtons().filter(enabled);
    const exact = buttons.find((element) => {
      const text = buttonLabel(element);
      return /^(?:continue|allow|同意|继续|允许)$/i.test(text);
    });
    if (exact) return exact;

    // Google sometimes ships bilingual / padded labels like "继续 Continue".
    return buttons.find((element) => {
      const text = buttonLabel(element);
      if (!text || text.length > 40) return false;
      if (isCancelActionLabel(text)) return false;
      return isConsentActionLabel(text);
    });
  }

  function findCancelButton() {
    return actionButtons().find((element) =>
      isCancelActionLabel(buttonLabel(element))
    );
  }

  function hasConsentActionPair() {
    return Boolean(findConsentButton() && findCancelButton());
  }

  function isAccountChooserPage() {
    const href = location.href;
    const text = pageText();
    // Soft-nav consent can keep an accountchooser URL; prefer consent UI signals.
    if (isConsentPage()) return false;
    return (
      /accountchooser|oauthchooseaccount|AccountChooser|signin\/account/i.test(
        href
      ) ||
      /choose an account|select an account|选择账号|选择一个账号/.test(text)
    );
  }

  function isConsentPage() {
    const href = location.href;
    const text = pageText();
    if (
      /\/consent|oauth\/consent|signin\/oauth(?:\/consent|\/id|\/legacy)?(?:\/|$|\?)/i.test(
        href
      )
    ) {
      return true;
    }
    // Modern Chinese/English confirmation copy: "Google 将允许 X 访问您的…"
    if (
      /wants to access your google account|google will allow|将允许.{0,100}访问|允许.{0,80}访问您的|要访问您的|要继续使用|登录[^.\n]{0,40}并继续/i.test(
        text
      )
    ) {
      return true;
    }
    // Confirmation screen always pairs Cancel + Continue, even when URL still
    // looks like the account chooser after a soft navigation.
    if (hasConsentActionPair() && !/选择账号|选择一个账号|choose an account|select an account/i.test(text)) {
      return true;
    }
    return Boolean(
      hasConsentActionPair() &&
        /@/.test(text) &&
        /privacy policy|隐私权政策|条款|terms of service/i.test(text)
    );
  }

  function report(status, message, detail = {}) {
    chrome.runtime.sendMessage({
      type: 'NOWBUILD_GOOGLE_AUTH_EVENT',
      status,
      message,
      detail,
    });
  }

  function readLoopState() {
    try {
      const raw = sessionStorage.getItem(LOOP_KEY);
      if (!raw) return { account: 0, consent: 0, updatedAt: 0 };
      return JSON.parse(raw);
    } catch {
      return { account: 0, consent: 0, updatedAt: 0 };
    }
  }

  function writeLoopState(state) {
    try {
      sessionStorage.setItem(
        LOOP_KEY,
        JSON.stringify({ ...state, updatedAt: Date.now() })
      );
    } catch {
      // sessionStorage may be unavailable; loop guard becomes best-effort.
    }
  }

  function bumpLoop(kind) {
    const state = readLoopState();
    // Reset if the previous bounce was long ago (new login attempt).
    if (Date.now() - (state.updatedAt || 0) > 60_000) {
      state.account = 0;
      state.consent = 0;
    }
    state[kind] = (state[kind] || 0) + 1;
    writeLoopState(state);
    return state;
  }

  function clearLoopState() {
    try {
      sessionStorage.removeItem(LOOP_KEY);
    } catch {
      // ignore
    }
  }

  function dispatchDomClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + Math.min(Math.max(rect.width / 2, 2), rect.width - 2);
    const y = rect.top + Math.min(Math.max(rect.height / 2, 2), rect.height - 2);
    const common = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
    };
    element.focus?.();
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      const EventCtor = type.startsWith('pointer') ? PointerEvent : MouseEvent;
      element.dispatchEvent(
        new EventCtor(type, {
          ...common,
          pointerType: 'mouse',
          isPrimary: true,
        })
      );
    }
    if (typeof element.click === 'function') element.click();
  }

  function clickWithTrustedInput(element) {
    const rect = element.getBoundingClientRect();
    const x = Math.round(
      rect.left + Math.min(Math.max(rect.width / 2, 2), rect.width - 2)
    );
    const y = Math.round(
      rect.top + Math.min(Math.max(rect.height / 2, 2), rect.height - 2)
    );
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            type: 'NOWBUILD_TRUSTED_CLICK',
            x,
            y,
          },
          (response) => {
            const err = chrome.runtime.lastError;
            if (err || !response?.ok) {
              dispatchDomClick(element);
              resolve(false);
              return;
            }
            resolve(true);
          }
        );
      } catch {
        dispatchDomClick(element);
        resolve(false);
      }
    });
  }

  function clickDefaultAccount() {
    // Never click the @ identity chip on the consent screen — that switches
    // accounts and bounces OAuth back to the chooser (Open Launch loop).
    if (isConsentPage() || hasConsentActionPair() || !isAccountChooserPage()) {
      return false;
    }
    if (completedAction === 'account') return false;

    const byIdentifier = [
      ...document.querySelectorAll('[data-identifier], [data-email]'),
    ].filter(visible);
    let account = byIdentifier.find((element) => {
      const id =
        element.getAttribute('data-identifier') ||
        element.getAttribute('data-email') ||
        '';
      return /@/.test(id);
    });

    if (!account) {
      const candidates = [
        ...document.querySelectorAll(
          'a, [role="link"], [role="button"], li, div[data-identifier], div'
        ),
      ].filter(visible);
      account = candidates.find((element) => {
        const text = normalize(element.textContent);
        if (text.length > 120) return false;
        return (
          /@/.test(text) &&
          !/use another account|使用其他账号|remove an account|移除账号/i.test(
            text
          )
        );
      });
    }

    if (!account) return false;

    const loop = bumpLoop('account');
    if ((loop.account || 0) >= LOOP_LIMIT && (loop.consent || 0) >= 1) {
      report(
        'needs_user_action',
        'Google 登录在选账号和确认之间循环，请你手动完成登录',
        { blocker: 'google_oauth_loop', stage: 'google_account' }
      );
      return true;
    }

    completedAction = 'account';
    report('navigating', '正在选择浏览器里的默认 Google 账号', {
      stage: 'google_account',
    });
    dispatchDomClick(account);
    return true;
  }

  function clickConsent() {
    if (Date.now() - lastConsentClickAt < 1200) return false;
    const consent = findConsentButton();
    if (!consent) return false;

    const loop = bumpLoop('consent');
    if ((loop.consent || 0) >= LOOP_LIMIT && (loop.account || 0) >= 1) {
      report(
        'needs_user_action',
        'Google 登录在选账号和确认之间循环，请你手动完成登录',
        { blocker: 'google_oauth_loop', stage: 'google_consent' }
      );
      return true;
    }

    completedAction = 'consent';
    lastConsentClickAt = Date.now();
    report('navigating', '正在确认 Google 登录并返回目录提交页', {
      stage: 'google_consent',
    });
    void clickWithTrustedInput(consent).then((trusted) => {
      // If the page is still the confirmation screen shortly after, allow retry.
      window.setTimeout(() => {
        if (isConsentPage() || hasConsentActionPair()) {
          completedAction = '';
          if (!trusted) {
            report('navigating', '确认按钮未生效，正在重试点击继续', {
              stage: 'google_consent_retry',
            });
          }
        }
      }, 1600);
    });
    return true;
  }

  function currentPageKind() {
    if (isConsentPage() || hasConsentActionPair()) return 'consent';
    if (
      /accountchooser|oauthchooseaccount|AccountChooser|signin\/account/i.test(
        location.href
      ) ||
      /choose an account|select an account|选择账号|选择一个账号/.test(pageText())
    ) {
      return 'account';
    }
    return 'other';
  }

  function inspect() {
    if (!active || attempts >= 120) return;
    attempts += 1;
    const pageKind = currentPageKind();
    if (pageKind !== lastPageKind) {
      completedAction = '';
      lastPageKind = pageKind;
    }
    if (document.querySelector('input[type="password"]')) {
      report(
        'needs_user_action',
        'Google 要求重新验证密码，请你完成后插件会继续',
        { blocker: 'google_reauthentication' }
      );
      return;
    }
    if (
      /verify it.?s you|2-step verification|two-step verification|验证您的身份|两步验证/i.test(
        pageText()
      )
    ) {
      report(
        'needs_user_action',
        'Google 要求二次验证，请你完成后插件会继续',
        { blocker: 'google_2fa' }
      );
      return;
    }
    // Prefer Continue/Allow. On consent pages the visible email is an account
    // switcher; clicking it restarts the chooser ↔ confirm bounce.
    clickConsent() || clickDefaultAccount();
    if (!/accounts\.google\.com/i.test(location.hostname)) {
      clearLoopState();
      return;
    }
    window.setTimeout(inspect, 250);
  }

  chrome.runtime.sendMessage(
    { type: 'NOWBUILD_GOOGLE_AUTH_HELLO', pageUrl: window.location.href },
    (response) => {
      if (!response?.active) return;
      active = true;
      inspect();
    }
  );
})();
