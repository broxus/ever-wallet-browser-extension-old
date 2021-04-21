import * as nt from '@nekoton'
import { GqlSocket, StorageConnector, Mutex } from '../../../../background/common'

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

const latestBlocks = new Map<string, string>()
export const setLatestBlock = (address: string, blockId: string) => {
    latestBlocks.set(address, blockId)
}

export const resetLatestBlock = (address: string) => {
    latestBlocks.delete(address)
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
        const address = tonWallet.address
        let pollingMethodChanged = false
        let lastPollingMethod = tonWallet.pollingMethod
        let currentBlockId: string | null = null

        while (true) {
            switch (lastPollingMethod) {
                case 'manual': {
                    currentBlockId = null
                    await new Promise<void>((resolve) => {
                        setTimeout(() => resolve(), POLLING_INTERVAL)
                    })
                    console.log('manual refresh')

                    const unlock = await lockSubscription(address)
                    await tonWallet.refresh()
                    unlock()

                    break
                }
                case 'reliable': {
                    if (pollingMethodChanged || currentBlockId == null) {
                        currentBlockId =
                            latestBlocks.get(address) || (await tonWallet.getLatestBlock()).id
                    }

                    const nextBlockId: string = await tonWallet.waitForNextBlock(currentBlockId, 60)
                    console.log(nextBlockId, currentBlockId != nextBlockId)

                    const unlock = await lockSubscription(address)
                    await tonWallet.handleBlock(nextBlockId)
                    unlock()

                    currentBlockId = nextBlockId
                    break
                }
            }

            const unlock = await lockSubscription(address)
            const pollingMethod = tonWallet.pollingMethod
            unlock()

            pollingMethodChanged = lastPollingMethod != pollingMethod
            lastPollingMethod = pollingMethod
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

const subscriptionMutex = new Map<string, Mutex>()
export const lockSubscription = async (address: string) => {
    let mutex = subscriptionMutex.get(address)
    if (mutex == null) {
        mutex = new Mutex()
        subscriptionMutex.set(address, mutex)
    }

    return await mutex.lock()
}

export const loadAccount = async (address: string) => {
    const accountsStorage = await loadAccountsStorage()
    const account = await accountsStorage.getAccount(address)
    if (account == null) {
        throw new Error("Selected account doesn't exist")
    }
    return account;
}
