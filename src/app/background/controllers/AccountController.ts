import { EventEmitter } from 'events'
import { Mutex } from 'await-semaphore'
import { InitializedConnection } from './ConnectionController'
import { NekotonRpcError, RpcErrorCode } from '../../../shared/utils'
import * as nt from '@nekoton'

const DEFAULT_POLLING_INTERVAL = 10000 // 10s
const BACKGROUND_POLLING_INTERVAL = 120000 // 2m

const NEXT_BLOCK_TIMEOUT = 60 // 60s

interface ApplicationStateOptions {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
}

interface ITonWalletHandler {
    onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction): void

    onMessageExpired(pendingTransaction: nt.PendingTransaction): void

    onStateChanged(newState: nt.AccountState): void

    onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo): void
}

class TonWalletSubscription {
    private readonly _connection: nt.GqlConnection
    private readonly _address: string
    private readonly _tonWallet: nt.TonWallet
    private readonly _tonWalletMutex: Mutex = new Mutex()
    private _loopPromise?: Promise<void>
    private _refreshTimer?: number
    private _pollingInterval: number = BACKGROUND_POLLING_INTERVAL
    private _currentPollingMethod: typeof nt.TonWallet.prototype.pollingMethod
    private _isRunning: boolean = false
    private _currentBlockId?: string
    private _suggestedBlockId?: string

    public static async subscribe(
        initializedConnection: InitializedConnection,
        address: string,
        publicKey: string,
        contractType: nt.ContractType,
        handler: ITonWalletHandler
    ) {
        const { connection } = initializedConnection.data

        const tonWallet = await connection.subscribeToTonWallet(publicKey, contractType, handler)
        if (tonWallet == null) {
            throw new NekotonRpcError(RpcErrorCode.INTERNAL, 'Failed to subscribe')
        }

        return new TonWalletSubscription(initializedConnection.data.connection, address, tonWallet)
    }

    private constructor(connection: nt.GqlConnection, address: string, tonWallet: nt.TonWallet) {
        this._connection = connection
        this._address = address
        this._tonWallet = tonWallet
        this._currentPollingMethod = this._tonWallet.pollingMethod
    }

    public async start() {
        if (this._loopPromise) {
            await this._loopPromise
        }

        this._loopPromise = new Promise<void>(async (resolve) => {
            outer: while (this._isRunning) {
                switch (this._currentPollingMethod) {
                    case 'manual': {
                        this._currentBlockId = undefined
                        await new Promise<void>((resolve) => {
                            this._refreshTimer = window.setTimeout(
                                () => resolve(),
                                this._pollingInterval
                            )
                        })
                        if (!this._isRunning) {
                            break outer
                        }

                        await this._tonWalletMutex.use(async () => {
                            await this._tonWallet.refresh()
                            this._currentPollingMethod = this._tonWallet.pollingMethod
                        })
                        break
                    }
                    case 'reliable': {
                        let nextBlockId: string
                        if (this._currentBlockId == null) {
                            console.warn('Starting reliable connection with unknown block')
                            const latestBlock = await this._connection.getLatestBlock(this._address)
                            this._currentBlockId = latestBlock.id
                            nextBlockId = this._currentBlockId
                        } else {
                            nextBlockId = await this._connection.waitForNextBlock(
                                this._currentBlockId,
                                this._address,
                                NEXT_BLOCK_TIMEOUT
                            )
                        }

                        await this._tonWalletMutex.use(async () => {
                            await this._tonWallet.handleBlock(nextBlockId)
                            this._currentPollingMethod = this._tonWallet.pollingMethod
                            this._currentBlockId = nextBlockId
                        })
                    }
                }
            }

            resolve()
        })
    }

    public async stop() {
        if (!this._isRunning) {
            return
        }

        this._isRunning = false

        window.clearTimeout(this._refreshTimer)
        this._refreshTimer = undefined

        await this._loopPromise
        this._loopPromise = undefined

        this._currentPollingMethod = await this._tonWalletMutex.use(async () => {
            return this._tonWallet.pollingMethod
        })

        this._currentBlockId = undefined
        this._suggestedBlockId = undefined
    }

    public async prepareReliablePolling() {
        this._suggestedBlockId = (await this._connection.getLatestBlock(this._address)).id
    }
}

export class AccountController extends EventEmitter {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore

    selectedAccount: nt.AssetsList | null = null
    tonWalletStates: Map<string, nt.AccountState> = new Map<string, nt.AccountState>()

    constructor({ storage, accountsStorage, keyStore }: ApplicationStateOptions) {
        super()
        this.storage = storage
        this.accountsStorage = accountsStorage
        this.keyStore = keyStore
    }

    public async initialSync() {
        const currentAccount = await this.accountsStorage.getCurrentAccount()
    }
}
