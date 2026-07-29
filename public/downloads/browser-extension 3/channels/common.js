(function installNowBuildChannelRuntime(global) {
  if (global.NowBuildChannelRuntime) return;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function visible(element) {
    if (!element?.getBoundingClientRect) return false;
    const rect = element.getBoundingClientRect();
    const style = global.getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < global.innerWidth &&
      rect.top < global.innerHeight &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0.1 &&
      element.getAttribute('aria-hidden') !== 'true'
    );
  }

  function normalizeText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/[\s\u200b]+/gu, ' ')
      .trim();
  }

  function roots(root = document) {
    const result = [root];
    for (const element of root.querySelectorAll?.('*') || []) {
      if (element.shadowRoot) result.push(...roots(element.shadowRoot));
    }
    return result;
  }

  function queryAll(selector, root = document) {
    return roots(root).flatMap((item) => [...(item.querySelectorAll?.(selector) || [])]);
  }

  function firstVisible(selectors, root = document) {
    for (const selector of selectors) {
      const match = queryAll(selector, root).find(visible);
      if (match) return match;
    }
    return null;
  }

  function byText(selectors, pattern, root = document) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const match = queryAll(selector, root).find(
        (element) => visible(element) && pattern.test(normalizeText(element.textContent))
      );
      if (match) return match;
    }
    return null;
  }

  async function waitFor(factory, errorMessage, timeout = 30000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const value = factory();
      if (value) return value;
      await sleep(250);
    }
    throw new Error(errorMessage);
  }

  function click(element) {
    element.scrollIntoView?.({ block: 'center', inline: 'center' });
    element.focus?.();
    element.click();
  }

  function setInputValue(element, value) {
    const text = String(value || '');
    element.scrollIntoView?.({ block: 'center' });
    element.focus();
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : null;
    const setter = prototype
      ? Object.getOwnPropertyDescriptor(prototype, 'value')?.set
      : null;
    if (setter) setter.call(element, text);
    else element.value = text;
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text,
    }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return element.value;
  }

  function requestNativeInsert(text) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'NOWBUILD_NATIVE_INSERT_TEXT', text },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response?.ok) {
            reject(new Error(response?.error || '浏览器原生文字输入失败'));
            return;
          }
          resolve();
        }
      );
    });
  }

  function selectAllContents(element) {
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = global.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function replaceRichText(element, value, options = {}) {
    const text = String(value || '');
    element.scrollIntoView?.({ block: 'center' });
    selectAllContents(element);
    await sleep(80);
    await requestNativeInsert(text);
    await sleep(options.settleMs || 350);
    const actual = normalizeText(element.innerText || element.textContent);
    const expected = normalizeText(text);
    const valid = options.contains ? actual.includes(expected) : actual === expected;
    if (!valid) {
      throw new Error(
        `${options.label || '编辑器'}没有接收完整内容（期望 ${expected.length} 字符，实际 ${actual.length} 字符）`
      );
    }
    return actual;
  }

  async function fill(element, value, options = {}) {
    if (!element) throw new Error(`${options.label || '字段'}不存在`);
    if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
      return replaceRichText(element, value, options);
    }
    const actual = setInputValue(element, value);
    if (normalizeText(actual) !== normalizeText(value)) {
      throw new Error(`${options.label || '输入框'}没有接收完整内容`);
    }
    return actual;
  }

  function uniqueTags(values, limit = Infinity) {
    const seen = new Set();
    const result = [];
    for (const value of values || []) {
      const tag = String(value || '').trim().replace(/^#/, '');
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) continue;
      seen.add(key);
      result.push(tag);
      if (result.length >= limit) break;
    }
    return result;
  }

  function parseCount(value) {
    const text = String(value || '').trim().replace(/,/g, '');
    const match = text.match(/([\d.]+)\s*(万|千|[KMB])?/i);
    if (!match) return undefined;
    const number = Number(match[1]);
    if (!Number.isFinite(number)) return undefined;
    const unit = (match[2] || '').toUpperCase();
    if (unit === '万') return Math.round(number * 10000);
    if (unit === '千' || unit === 'K') return Math.round(number * 1000);
    if (unit === 'M') return Math.round(number * 1000000);
    if (unit === 'B') return Math.round(number * 1000000000);
    return Math.round(number);
  }

  function countNearText(pattern, root = document) {
    const element = queryAll('button, a, span, div', root).find(
      (item) => visible(item) && pattern.test(normalizeText(item.getAttribute('aria-label') || item.textContent))
    );
    if (!element) return undefined;
    return parseCount(element.getAttribute('aria-label')) ?? parseCount(element.textContent);
  }

  global.NowBuildChannelRuntime = {
    sleep,
    visible,
    normalizeText,
    roots,
    queryAll,
    firstVisible,
    byText,
    waitFor,
    click,
    setInputValue,
    requestNativeInsert,
    replaceRichText,
    fill,
    uniqueTags,
    parseCount,
    countNearText,
  };
})(globalThis);
