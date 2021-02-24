import libnekoton from "../../nekoton/pkg";

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    const url = new URL(tab.url ?? '');

    chrome.browserAction.setBadgeText({text: url.host});
});

(async () => {
    const nekoton = await libnekoton;
    nekoton.greet();
})();
