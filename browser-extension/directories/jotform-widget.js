(() => {
  const ALLOWED_PARENT = 'https://form.jotform.com';

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForControl(selector, timeout = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const control = document.querySelector(selector);
      if (control) return control;
      await sleep(100);
    }
    return null;
  }

  async function transformAsset(asset, spec) {
    const response = await fetch(asset.dataUrl);
    const original = await response.blob();
    if (!spec?.width || !spec?.height || typeof createImageBitmap !== 'function') {
      return original;
    }
    const bitmap = await createImageBitmap(original);
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const context = canvas.getContext('2d');
    const scale = Math.max(spec.width / bitmap.width, spec.height / bitmap.height);
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
    return new Promise((resolve) =>
      canvas.toBlob(
        (blob) => resolve(blob || original),
        spec.type || original.type,
        spec.quality
      )
    );
  }

  async function uploadImage(message) {
    const input = await waitForControl('input[type="file"]');
    if (!input) throw new Error('Jotform image input was not found');
    const blob = await transformAsset(message.asset, message.spec);
    const type = message.spec?.type || message.asset.type || blob.type;
    const name = String(message.asset.name || 'logo')
      .replace(/\.[^.]+$/, '')
      .concat(type === 'image/jpeg' ? '.jpg' : '.png');
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], name, { type, lastModified: Date.now() }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { name };
  }

  async function fillTags(message) {
    const input = await waitForControl('input[type="text"], textarea');
    if (!input) throw new Error('Jotform tag input was not found');
    input.focus();
    input.value = (message.tags || []).join(',');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })
    );
    input.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })
    );
    return { count: message.tags?.length || 0 };
  }

  window.addEventListener('message', async (event) => {
    if (
      event.origin !== ALLOWED_PARENT ||
      event.data?.type !== 'NOWBUILD_JOTFORM_WIDGET_ACTION'
    ) {
      return;
    }
    try {
      const detail =
        event.data.action === 'upload_image'
          ? await uploadImage(event.data)
          : event.data.action === 'fill_tags'
            ? await fillTags(event.data)
            : (() => {
                throw new Error('Unsupported Jotform widget action');
              })();
      parent.postMessage(
        {
          type: 'NOWBUILD_JOTFORM_WIDGET_RESULT',
          requestId: event.data.requestId,
          ok: true,
          ...detail,
        },
        event.origin
      );
    } catch (error) {
      parent.postMessage(
        {
          type: 'NOWBUILD_JOTFORM_WIDGET_RESULT',
          requestId: event.data.requestId,
          ok: false,
          error: error?.message || 'Jotform widget operation failed',
        },
        event.origin
      );
    }
  });
})();
