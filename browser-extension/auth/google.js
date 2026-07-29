(function installNowBuildGoogleAuthAssistant() {
  if (window.__nowbuildGoogleAuthAssistantInstalled) return;
  window.__nowbuildGoogleAuthAssistantInstalled = true;

  let active = false;
  let completedAction = '';
  let attempts = 0;

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

  function report(status, message, detail = {}) {
    chrome.runtime.sendMessage({
      type: 'NOWBUILD_GOOGLE_AUTH_EVENT',
      status,
      message,
      detail,
    });
  }

  function clickDefaultAccount() {
    const candidates = [...document.querySelectorAll('a, [role="link"]')].filter(
      visible
    );
    const account = candidates.find((element) => {
      const text = normalize(element.textContent);
      return (
        /@/.test(text) &&
        !/use another account|使用其他账号|remove an account|移除账号/i.test(text)
      );
    });
    if (!account || completedAction === 'account') return false;
    completedAction = 'account';
    report('navigating', '正在选择浏览器里的默认 Google 账号', {
      stage: 'google_account',
    });
    account.click();
    return true;
  }

  function clickConsent() {
    const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(
      visible
    );
    const consent = buttons.find((element) =>
      /^(continue|allow|继续|允许)$/i.test(normalize(element.textContent))
    );
    if (!consent || completedAction === 'consent') return false;
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
        normalize(document.body?.innerText)
      )
    ) {
      report(
        'needs_user_action',
        'Google 要求二次验证，请你完成后插件会继续',
        { blocker: 'google_2fa' }
      );
      return;
    }
    if (clickDefaultAccount() || clickConsent()) return;
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
