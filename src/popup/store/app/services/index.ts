import * as nt from '@nekoton'
import { GqlSocket, StorageConnector } from '../../../../background/common'

let storage: nt.Storage | null = null
export const loadStorage = () => {
    if (storage == null) {
        storage = new nt.Storage(new StorageConnector())
    }
    return storage
}

let accountsStoragePromise: Promise<nt.AccountsStorage> | null = null
export const loadAccountsStorage = async () => {
    if (accountsStoragePromise == null) {
        accountsStoragePromise = nt.AccountsStorage.load(loadStorage())
    }
    return accountsStoragePromise
}

let keystorePromise: Promise<nt.KeyStore> | null = null
export const loadKeyStore = async () => {
    if (keystorePromise == null) {
        keystorePromise = nt.KeyStore.load(loadStorage())
    }
    return keystorePromise
}

type ConnectionState = {
    socket: GqlSocket
    connection: nt.GqlConnection
}

let connectionPromise: Promise<ConnectionState> | null = null
const loadConnection = async () => {
    if (connectionPromise == null) {
        const socket = new GqlSocket()

        connectionPromise = socket
            .connect({
                endpoint: 'https://main.ton.dev/graphql',
                timeout: 60000, // 60s
            })
            .then(
                (connection) =>
                    <ConnectionState>{
                        socket,
                        connection,
                    }
            )
    }
    return connectionPromise
}

export interface ITonWalletHandler {
    onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction): void
    onMessageExpired(pendingTransaction: nt.PendingTransaction): void
    onStateChanged(newState: nt.AccountState): void
    onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo): void
}

const subscribe = async (
    publicKey: string,
    contractType: nt.ContractType,
    handler: ITonWalletHandler
) => {
    const ctx = await loadConnection()

    const tonWallet = await ctx.connection.subscribeToTonWallet(publicKey, contractType, handler)
    if (tonWallet == null) {
        throw Error('Failed to subscribe')
    }

    const POLLING_INTERVAL = 10000 // 10s

    ;(async () => {
        let currentBlockId: string | null = null
        let lastPollingMethod = tonWallet.pollingMethod
        while (true) {
            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), POLLING_INTERVAL)
            })
            console.log('manual refresh')
            await tonWallet.refresh()

            console.log(tonWallet.accountState())

            // switch (lastPollingMethod) {
            // case 'manual': {
            //     await new Promise<void>((resolve) => {
            //         setTimeout(() => resolve(), POLLING_INTERVAL)
            //     })
            //     console.log('manual refresh')
            //     await tonWallet.refresh()
            //     break
            // }
            // case 'reliable': {
            //     if (lastPollingMethod != 'reliable' || currentBlockId == null) {
            //         currentBlockId = (await tonWallet.getLatestBlock()).id
            //     }
            //
            //     const nextBlockId: string = await tonWallet.waitForNextBlock(currentBlockId, 60)
            //     console.log(nextBlockId, currentBlockId != nextBlockId)
            //
            //     await tonWallet.handleBlock(nextBlockId)
            //     currentBlockId = nextBlockId
            //     break
            // }
            // }

            // lastPollingMethod = tonWallet.pollingMethod
        }
    })().then((_) => {})

    return tonWallet
}

const subscriptions = new Map<string, Promise<nt.TonWallet>>()
export const loadSubscription = async (
    publicKey: string,
    contractType: nt.ContractType,
    handler: (address: string) => ITonWalletHandler
): Promise<nt.TonWallet> => {
    const address = nt.computeTonWalletAddress(publicKey, contractType, 0)
    let subscription = subscriptions.get(address)
    if (subscription == null) {
        subscription = subscribe(publicKey, contractType, handler(address))
        subscriptions.set(address, subscription)
    }

    return subscription
}
