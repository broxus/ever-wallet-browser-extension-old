import init, * as nt from "../../nekoton/pkg";
import {GqlSocket, mergeTransactions} from "./common";

const LITECLIENT_EXTENSION_ID = 'fakpmbkocblneahenciednepadenbdpb';

const CONFIG_URL: string = 'https://freeton.broxus.com/mainnet.config.json';

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    const url = new URL(tab.url ?? '');

    chrome.browserAction.setBadgeText({text: url.host});
});

(async () => {
    await init('index_bg.wasm');

    // ADNL example
    // {
    //     const config: Config = await fetch(CONFIG_URL).then(data => data.json()).then(Config.parse);
    //     console.log("Config loaded:", config);
    //
    //     const socket = new AdnlSocket(LITECLIENT_EXTENSION_ID);
    //     const connection = await socket.connect(config);
    //
    //     const core = TonInterface.overAdnl(connection);
    //     console.log(await core.getAccountState());
    // }

    // GraphQL example
    {
        const socket = new GqlSocket();
        const connection = await socket.connect({
            endpoint: 'https://main.ton.dev/graphql',
            timeout: 60000, // 60s
        });

        const core = nt.TonInterface.overGraphQL(connection);

        //startListener(connection, "-1:3333333333333333333333333333333333333333333333333333333333333333");
        startListener(connection, "0:a921453472366b7feeec15323a96b5dcf17197c88dc0d4578dfa52900b8a33cb");
    }

    // Helper examples
    let addr = nt.unpackAddress("EQCGFc7mlPWLihHoLkst3Yo9vkv-dQLpVNl8CgAt6juQFHqZ", true);
    console.log(addr.to_string());
})();

function startListener(connection: nt.GqlConnection, address: string) {
    const POLLING_INTERVAL = 10000; // 10s

    const knownTransactions = new Array<nt.Transaction>();

    class MainWalletHandler {
        onStateChanged(newState: nt.AccountState) {
            console.log(newState);
        }

        onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.BatchInfo) {
            console.log("New transactions batch: ", info);
            mergeTransactions(knownTransactions, transactions, info);

            console.log("All sorted:", checkTransactionsSorted(knownTransactions));
        }
    }

    (async () => {
        const handler = new MainWalletHandler();

        const subscription = await connection.subscribeToMainWallet(address, handler);

        if (knownTransactions.length !== 0) {
            const oldestKnownTransaction = knownTransactions[knownTransactions.length - 1];
            if (oldestKnownTransaction.prevTransactionId != null) {
                await subscription.preloadTransactions(oldestKnownTransaction.prevTransactionId);
            }
        }

        let currentBlockId: string | null = null;
        let lastPollingMethod = subscription.pollingMethod;
        while (true) {
            switch (lastPollingMethod) {
                case 'manual': {
                    await new Promise<void>((resolve,) => {
                        setTimeout(() => resolve(), POLLING_INTERVAL);
                    });
                    console.log("manual refresh");
                    await subscription.refresh();
                    break;
                }
                case 'reliable': {
                    if (lastPollingMethod != 'reliable' || currentBlockId == null) {
                        currentBlockId = (await subscription.getLatestBlock()).id;
                    }

                    const nextBlockId: string = await subscription.waitForNextBlock(currentBlockId, 60);
                    console.log(nextBlockId, currentBlockId != nextBlockId);

                    await subscription.handleBlock(nextBlockId);
                    currentBlockId = nextBlockId;
                    break;
                }
            }

            lastPollingMethod = subscription.pollingMethod;
        }
    })();
}

function checkTransactionsSorted(transactions: Array<nt.Transaction>) {
    transactions.reduce(({sorted, previous}, current) => {
        const result = previous ? sorted && previous.id.lt.localeCompare(current.id.lt) > 0 : true;
        return {sorted: result, previous: current};
    }, <{ sorted: boolean, previous: nt.Transaction | null }>{sorted: true, previous: null}).sorted
}
