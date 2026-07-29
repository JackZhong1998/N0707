document.getElementById('version').textContent = `Version ${chrome.runtime.getManifest().version}`;

document.getElementById('open-console').addEventListener('click', async () => {
  await chrome.tabs.create({
    url: chrome.runtime.getURL('test-console/index.html'),
  });
  window.close();
});
