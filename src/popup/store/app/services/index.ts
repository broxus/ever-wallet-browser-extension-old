import { Mutex } from 'await-semaphore'
import { GqlSocket, StorageConnector } from '../../../../shared'
import * as nt from '@nekoton'

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
export const loadConnection = async () => {
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

const subscriptions = new Map<string, Promise<nt.TonWallet>>()
const subscribe = async (
    publicKey: string,
    contractType: nt.ContractType,
    handler: ITonWalletHandler
) => {
    const { connection } = await loadConnection()

    const tonWallet = await connection.subscribeToTonWallet(publicKey, contractType, handler)
    if (tonWallet == null) {
        throw Error('Failed to subscribe')
    }

    const POLLING_INTERVAL = 10000 // 10s

    ;(async () => {
        const address = tonWallet.address
        let pollingMethodChanged = false
        let currentPollingMethod = tonWallet.pollingMethod
        let currentBlockId: string | null = null

        while (true) {
            let nextPollingMethod!: typeof tonWallet.pollingMethod

            switch (currentPollingMethod) {
                case 'manual': {
                    currentBlockId = null
                    await new Promise<void>((resolve) => {
                        setTimeout(() => resolve(), POLLING_INTERVAL)
                    })
                    console.log('manual refresh')

                    await lockSubscription(address).use(async () => {
                        await tonWallet.refresh()
                        nextPollingMethod = tonWallet.pollingMethod
                    })
                    break
                }
                case 'reliable': {
                    if (pollingMethodChanged || currentBlockId == null) {
                        currentBlockId =
                            latestBlocks.get(address) ||
                            (await connection.getLatestBlock(address)).id
                    }

                    const nextBlockId: string = await connection.waitForNextBlock(
                        currentBlockId,
                        address,
                        60
                    )

                    await lockSubscription(address).use(async () => {
                        await tonWallet.handleBlock(nextBlockId)
                        nextPollingMethod = tonWallet.pollingMethod
                    })

                    currentBlockId = nextBlockId
                    break
                }
            }

            pollingMethodChanged = currentPollingMethod != nextPollingMethod
            currentPollingMethod = nextPollingMethod

            if (!subscriptions.has(address)) {
                break
            }
        }
    })().then((_) => {})

    return tonWallet
}

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
export const lockSubscription = (address: string) => {
    let mutex = subscriptionMutex.get(address)
    if (mutex == null) {
        mutex = new Mutex()
        subscriptionMutex.set(address, mutex)
    }

    return mutex
}

export const clearSubscriptions = () => {
    subscriptions.clear()
    subscriptionMutex.clear()
    latestBlocks.clear()
}

export const loadAccount = async (address: string) => {
    const accountsStorage = await loadAccountsStorage()
    const account = await accountsStorage.getAccount(address)
    if (account == null) {
        throw new Error("Selected account doesn't exist")
    }
    return account
}
