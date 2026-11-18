// Toolbar button: open the game, or bring back the tab it is already in (a second copy would build a second world).
// runtime.getContexts finds our own pages without the "tabs" permission.
const url = chrome.runtime.getURL('index.html');
chrome.action.onClicked.addListener(async () => {
  const [open] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
  if (open) {
    await chrome.tabs.update(open.tabId, { active: true });
    await chrome.windows.update(open.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
});
