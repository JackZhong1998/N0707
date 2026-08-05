(function installNowBuildGoogleAuthAssistant() {
  if (window.__nowbuildGoogleAuthAssistantInstalled) return;
  window.__nowbuildGoogleAuthAssistantInstalled = true;

  let active = false;
  let completedAction = '';
  let attempts = 0;

  const LOOP_KEY = 'nowbuild:google-auth-loop';
  const LOOP_LIMIT = 4;

  const visible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  function pageText() {
    return normalize(document.body?.innerText).slice(0, 3000);
  }

  function isAccountChooserPage() {
    const href = location.href;
    const text = pageText();
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
    return (
      /\/consent|oauth\/consent|signin\/oauth(?:\/|$)/i.test(href) ||
      /wants to access your google account|要访问您的.{0,40}账号|continue to [^.\n]{2,80}|要继续使用/.test(
        text
      )
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

  function clickDefaultAccount() {
    // Never click the @ identity chip on the consent screen — that switches
    // accounts and bounces OAuth back to the chooser (Open Launch loop).
    if (isConsentPage() || !isAccountChooserPage()) return false;
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
        ...document.querySelectorAll('a, [role="link"], [role="button"], li, div'),
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
    account.click();
    return true;
  }

  function clickConsent() {
    if (completedAction === 'consent') return false;
    const buttons = [
      ...document.querySelectorAll('button, [role="button"], input[type="submit"]'),
    ].filter(visible);
    const consent = buttons.find((element) => {
      const text = normalize(
        element.textContent || element.getAttribute('value') || ''
      );
      return /^(continue|allow|继续|允许)$/i.test(text);
    });
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
    report('navigating', '正在确认 Google 登录并返回目录提交页', {
      stage: 'google_consent',
    });
    consent.click();
    return true;
  }

  function inspect() {
    if (!active || attempts >= 80) return;
    attempts += 1;
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
    if (clickConsent() || clickDefaultAccount()) return;
    if (!/accounts\.google\.com/i.test(location.hostname)) {
      clearLoopState();
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
