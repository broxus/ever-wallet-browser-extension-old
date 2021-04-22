import init, * as nt from '../../nekoton/pkg'
import { GqlSocket, mergeTransactions, StorageConnector } from './common'
import ItemType = chrome.contextMenus.ItemType
;(async () => {
    await init('index_bg.wasm')

    const socket = new GqlSocket()
    const connection = await socket.connect({
        endpoint: 'https://main.ton.dev/graphql',
        timeout: 60000, // 60s
    })

    //await startListener(connection)
})()

async function startListener(connection: nt.GqlConnection) {
    const POLLING_INTERVAL = 10000 // 10s

    const storage = new nt.Storage(new StorageConnector())

    // Keystore
    const keystore = await nt.KeyStore.load(storage)
    // await keystore.clear()
    // await keystore.addKey('Main key', {
    //     type: 'master_key',
    //     data: {
    //         params: {
    //             phrase:
    //                 'naive pudding fabric canal round peanut nature metal fog exhibit security side',
    //         },
    //         password: '1234',
    //     },
    // })

    const keystoreEntries = await keystore.getKeys()
    if (keystoreEntries.length === 0) {
        return
    }
    const publicKey = keystoreEntries[0].publicKey

    const knownTransactions = new Array<nt.Transaction>()

    class TonWalletHandler {
        onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
            console.log(pendingTransaction, transaction)
        }

        onMessageExpired(pendingTransaction: nt.PendingTransaction) {
            console.log(pendingTransaction)
        }

        onStateChanged(newState: nt.AccountState) {
            console.log(newState)
        }

        onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo) {
            console.log('New transactions batch: ', info)
            mergeTransactions(knownTransactions, transactions, info)

            console.log('All sorted:', checkTransactionsSorted(knownTransactions))
        }
    }

    const handler = new TonWalletHandler()

    const wallet = await connection.subscribeToTonWallet(publicKey, 'WalletV3', handler)

    if (knownTransactions.length !== 0) {
        const oldestKnownTransaction = knownTransactions[knownTransactions.length - 1]
        if (oldestKnownTransaction.prevTransactionId != null) {
            await wallet.preloadTransactions(
                oldestKnownTransaction.prevTransactionId.lt,
                oldestKnownTransaction.prevTransactionId.hash
            )
        }
    }

    let currentBlockId: string | null = null
    let lastPollingMethod = wallet.pollingMethod
    let i = 0
    while (true) {
        //i += 1

        switch (lastPollingMethod) {
            case 'manual': {
                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), POLLING_INTERVAL)
                })
                console.log('manual refresh')
                await wallet.refresh()
                break
            }
            case 'reliable': {
                if (lastPollingMethod != 'reliable' || currentBlockId == null) {
                    currentBlockId = (await wallet.getLatestBlock()).id
                }

                const nextBlockId: string = await wallet.waitForNextBlock(currentBlockId, 60)
                console.log(nextBlockId, currentBlockId != nextBlockId)

                await wallet.handleBlock(nextBlockId)
                currentBlockId = nextBlockId
                break
            }
        }

        if (i == 1) {
            console.log('Preparing message')
            const contractState = await wallet.getContractState()
            if (contractState == null) {
                console.log('Contract state is empty')
                continue
            }

            const dest = '0:a921453472366b7feeec15323a96b5dcf17197c88dc0d4578dfa52900b8a33cb'
            const amount = '10000000' // 0.01 TON
            const bounce = false
            const timeout = 60 // expire in 60 seconds

            const unsignedMessage = wallet.prepareTransfer(
                contractState,
                dest,
                amount,
                bounce,
                '',
                timeout
            )
            if (unsignedMessage == null) {
                console.log('Contract must be deployed first')

                const unsignedDeployMessage = wallet.prepareDeploy(60)

                // estimate fees
                {
                    const signedMessage = unsignedDeployMessage.signFake()
                    const totalFees = await wallet.estimateFees(signedMessage)
                    console.log('Fees:', totalFees)
                }

                // send message
                {
                    const signedMessage = await keystore.sign(unsignedDeployMessage, {
                        type: 'master_key',
                        data: { publicKey, password: '1234' },
                    })
                    const totalFees = await wallet.estimateFees(signedMessage)
                    console.log('Signed message fees:', totalFees)

                    currentBlockId = (await wallet.getLatestBlock()).id
                    const pendingTransaction = await wallet.sendMessage(signedMessage)
                    console.log(pendingTransaction)
                }

                continue
            }

            // estimate fees
            {
                const signedMessage = unsignedMessage.signFake()
                const totalFees = await wallet.estimateFees(signedMessage)
                console.log('Fees:', totalFees)
            }

            // send message
            {
                const signedMessage = await keystore.sign(unsignedMessage, {
                    type: 'master_key',
                    data: { publicKey, password: '1234' },
                })
                const totalFees = await wallet.estimateFees(signedMessage)
                console.log('Signed message fees:', totalFees)

                currentBlockId = (await wallet.getLatestBlock()).id
                const pendingTransaction = await wallet.sendMessage(signedMessage)
                console.log(pendingTransaction)
            }
        }

        lastPollingMethod = wallet.pollingMethod
    }
}

function checkTransactionsSorted(transactions: Array<nt.Transaction>) {
    return transactions.reduce(
        ({ sorted, previous }, current) => {
            const result = previous
                ? sorted && previous.id.lt.localeCompare(current.id.lt) > 0
                : true
            return { sorted: result, previous: current }
        },
        <{ sorted: boolean; previous: nt.Transaction | null }>{ sorted: true, previous: null }
    ).sorted
}
