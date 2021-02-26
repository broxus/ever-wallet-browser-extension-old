//import libnekoton from "../../nekoton/pkg";

const CONFIG_URL = 'https://freeton.broxus.com/mainnet.config.json';

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    const url = new URL(tab.url ?? '');

    chrome.browserAction.setBadgeText({text: url.host});
});

(async () => {
    //const nekoton = await libnekoton;
    const config = await fetch(CONFIG_URL).then(data => data.json());

    console.log(config);
})();
