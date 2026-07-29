document.getElementById('version').textContent = `版本 ${chrome.runtime.getManifest().version}`;

document.getElementById('open-console').addEventListener('click', async () => {
  await chrome.tabs.create({
    url: chrome.runtime.getURL('test-console/index.html'),
  });
  window.close();
});
