import init, * as nt from "../../nekoton/pkg";
import {GqlSocket, mergeTransactions, StorageConnector} from "./common";

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

        startListener(connection, {
            publicKey: "1161f67ca580dd2b9935967b04109e0e988601fc0894e145f7cd56534e817257",
            contractType: 'WalletV3'
        });
    }

    // Helper examples
    let addr = nt.unpackAddress("EQCGFc7mlPWLihHoLkst3Yo9vkv-dQLpVNl8CgAt6juQFHqZ", true);
    console.log(addr.to_string());
})();

async function testKeystore() {
    const storage = new nt.Storage(new StorageConnector());

    // keystore
    const keystore = await nt.KeyStore.load(storage);

    const mnemonic = nt.StoredKey.generateMnemonic(nt.AccountType.makeLabs(0));
    const newStoredKey = mnemonic.createKey("Name", "123");

    const restoredKey = new nt.StoredKey('Name2', mnemonic.phrase, mnemonic.accountType, "123123123");

    const newPublicKey = await keystore.addKey(newStoredKey);
    const newRestoredPublicKeyKey = await keystore.addKey(restoredKey);

    await keystore.removeKey(newPublicKey);
    const tempGetKey = await keystore.getKey(newRestoredPublicKeyKey);
    if (!tempGetKey) {
        return;
    }

    const accountsStorage = await nt.AccountsStorage.load(storage);
    const currentAccount = await accountsStorage.getCurrentAccount();
    console.log("Current account:", currentAccount);

    // accounts
    const address = await accountsStorage.addAccount("Account 1", tempGetKey.publicKey, 'SurfWallet', true);

    const assets = await accountsStorage.getAccount(address);
    if (assets == null) {
        return;
    }

    //await keystore.clear();
}

function startListener(connection: nt.GqlConnection, {publicKey, contractType}: { publicKey: string, contractType: nt.ContractType }) {
    const POLLING_INTERVAL = 10000; // 10s

    const knownTransactions = new Array<nt.Transaction>();

    const storage = new nt.Storage(new StorageConnector());
    const accountStateCache = new nt.TonWalletStateCache(storage);

    const wallet = new nt.TonWallet(publicKey, contractType);
    const address = wallet.address;

    class TonWalletHandler {
        constructor(private address: string) {
        }

        onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
            console.log(pendingTransaction, transaction);
        }

        onMessageExpired(pendingTransaction: nt.PendingTransaction) {
            console.log(pendingTransaction);
        }

        onStateChanged(newState: nt.AccountState) {
            accountStateCache.store(address, newState);
            console.log(newState);
        }

        onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo) {
            console.log("New transactions batch: ", info);
            mergeTransactions(knownTransactions, transactions, info);

            console.log("All sorted:", checkTransactionsSorted(knownTransactions));
        }
    }

    (async () => {
        const handler = new TonWalletHandler(address);

        console.log("Restored state: ", await accountStateCache.load(address));

        const subscription = await connection.subscribeToTonWallet(address, handler);

        if (knownTransactions.length !== 0) {
            const oldestKnownTransaction = knownTransactions[knownTransactions.length - 1];
            if (oldestKnownTransaction.prevTransactionId != null) {
                await subscription.preloadTransactions(oldestKnownTransaction.prevTransactionId);
            }
        }

        let currentBlockId: string | null = null;
        let lastPollingMethod = subscription.pollingMethod;
        for (let i = 0; i < 10; ++i) {
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

            if (i == 3) {
                console.log("Preparing message");
                const contractState = await subscription.getContractState();
                if (contractState == null) {
                    console.log("Contract state is empty");
                    continue;
                }

                const dest = "-1:3333333333333333333333333333333333333333333333333333333333333333";
                const amount = "1000000000"; // 1 TON
                const bounce = false;
                const expireAt = new Date().getTime() + 60; // expire in 60 seconds

                const unsignedMessage = wallet.prepareTransfer(contractState, dest, amount, bounce, expireAt);
                if (unsignedMessage == null) {
                    console.log("Contract must be deployed first");
                    continue;
                }

                const signedMessage = unsignedMessage.signFake();
                const totalFees = await subscription.estimateFees(signedMessage);
                console.log("Fees:", totalFees);
            }
        }
    })();
}

function checkTransactionsSorted(transactions: Array<nt.Transaction>) {
    return transactions.reduce(({sorted, previous}, current) => {
        const result = previous ? sorted && previous.id.lt.localeCompare(current.id.lt) > 0 : true;
        return {sorted: result, previous: current};
    }, <{ sorted: boolean, previous: nt.Transaction | null }>{sorted: true, previous: null}).sorted;
}
