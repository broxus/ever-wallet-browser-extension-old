chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    const url = new URL(tab.url ?? '');

    chrome.browserAction.setBadgeText({text: url.host});
});
