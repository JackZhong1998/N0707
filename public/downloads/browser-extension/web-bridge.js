const WEB_COMMAND_TYPE = 'NOWBUILD_EXTENSION_COMMAND';
const WEB_EVENT_TYPE = 'NOWBUILD_EXTENSION_EVENT';

function isWebCommand(data) {
  return (
    data &&
    data.source === 'NOWBUILD_WEB' &&
    data.type === WEB_COMMAND_TYPE &&
    typeof data.command === 'string'
  );
}

window.addEventListener('message', (event) => {
  if (event.source !== window || !isWebCommand(event.data)) return;
  chrome.runtime.sendMessage(event.data, (response) => {
    window.postMessage(
      {
        source: 'NOWBUILD_EXTENSION',
        type: WEB_EVENT_TYPE,
        requestId: event.data.requestId,
        response: response || {
          ok: false,
          error: chrome.runtime.lastError?.message || 'Extension unavailable',
        },
      },
      window.location.origin
    );
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== WEB_EVENT_TYPE) return;
  window.postMessage(
    {
      source: 'NOWBUILD_EXTENSION',
      ...message,
    },
    window.location.origin
  );
});

window.postMessage(
  {
    source: 'NOWBUILD_EXTENSION',
    type: WEB_EVENT_TYPE,
    status: 'bridge_ready',
  },
  window.location.origin
);
