//import libnekoton, {AccountId, AdnlConnection, LastBlockIdExt, TransactionId} from "../../nekoton/pkg";
import libnekoton from "../../nekoton/pkg";

//const CONFIG_URL: string = 'https://freeton.broxus.com/mainnet.config.json';

(async () => {
    const nekoton = await libnekoton;
    console.log(nekoton);
    // Test crypto

    let acc: libnekoton.MnemonicType = new libnekoton.MnemonicType(0,"Legacy" );

    const result = nekoton.CryptoHandler.generate(acc, "Test");
    console.log(result);


    // const config: Config = await fetch(CONFIG_URL).then(data => data.json()).then(Config.parse);
    // console.log("Config loaded:", config);
    //
    // const client = new AdnlClient(nekoton.AdnlConnection.fromKey(config.key));
    // await client.connect(config.address, config.port);
    //
    // console.log("Initialized");
    //
    // const latestBlockId = await client.getLatestBlockId();
    // console.log(latestBlockId);
    //
    // const accountId = nekoton.AccountId.parse('0:a921453472366b7feeec15323a96b5dcf17197c88dc0d4578dfa52900b8a33cb');
    //
    // const accountState = await client.getAccountState(latestBlockId, accountId);
    // console.log("Got account state for", accountId.toString(), accountState);
    //
    // let lastTransactionId = accountState.lastTransactionId;
    // while (lastTransactionId != null) {
    //     const transactions = await client.getTransactions(accountId, lastTransactionId, 16);
    //
    //     lastTransactionId = undefined;
    //     transactions.forEach(transaction => {
    //         lastTransactionId = transaction.previousTransactionId;
    //         console.log(transaction.id.toString(), transaction.now);
    //     });
    // }
    //
    // setTimeout(async () => {
    //     await client.close();
    //     console.log("Closed");
    // }, 20000);
})();
