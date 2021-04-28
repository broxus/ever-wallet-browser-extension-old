import { Mutex } from 'await-semaphore'
import { ConnectionController, InitializedConnection } from './ConnectionController'
import { NekotonRpcError } from '../../../shared/utils'
import { RpcErrorCode } from '../../../shared/errors'
import * as nt from '@nekoton'
import { BaseConfig, BaseController, BaseState } from './BaseController'
import { mergeTransactions } from '../../../shared'

const SELECTED_ACCOUNT = 'selectedAccount'
const ACCOUNT_STATES_STORE_KEY = 'accountStates'
const ACCOUNT_TRANSACTIONS_STORE_KEY = 'accountTransactions'
const PENDING_MESSAGES_STORE_KEY = 'accountPendingMessages'

const DEFAULT_POLLING_INTERVAL = 10000 // 10s
const BACKGROUND_POLLING_INTERVAL = 120000 // 2m

const NEXT_BLOCK_TIMEOUT = 60 // 60s

type SendMessagePromiseResolve = (transaction: nt.Transaction) => void
type SendMessagePromiseReject = (error?: Error) => void

interface SendMessageCallback {
    resolve: SendMessagePromiseResolve
    reject: SendMessagePromiseReject
}

export interface SendMessageRequest {
    id: string
    expireAt: number
    boc: string
}

interface StoredSendMessageRequest extends SendMessageRequest {
    transaction: nt.PendingTransaction
}

export interface AccountControllerConfig extends BaseConfig {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
    connectionController: ConnectionController
}

export interface AccountControllerState extends BaseState {
    [SELECTED_ACCOUNT]: nt.AssetsList | undefined
    [ACCOUNT_STATES_STORE_KEY]: { [address: string]: nt.AccountState }
    [ACCOUNT_TRANSACTIONS_STORE_KEY]: { [address: string]: nt.Transaction[] }
    [PENDING_MESSAGES_STORE_KEY]: { [address: string]: StoredSendMessageRequest[] }
}

const defaultState: AccountControllerState = {
    [SELECTED_ACCOUNT]: undefined,
    [ACCOUNT_STATES_STORE_KEY]: {},
    [ACCOUNT_TRANSACTIONS_STORE_KEY]: {},
    [PENDING_MESSAGES_STORE_KEY]: {},
}

export class AccountController extends BaseController<
    AccountControllerConfig,
    AccountControllerState
> {
    private readonly _tonWalletSubscriptions: Map<string, TonWalletSubscription> = new Map()

    constructor(config: AccountControllerConfig, state?: AccountControllerState) {
        super(config, state || defaultState)
    }

    public async initialSync() {
        if (this._tonWalletSubscriptions.size != 0) {
            throw new Error('Must not sync twice')
        }

        const address = await this.config.accountsStorage.getCurrentAccount()
        if (address == null) {
            return
        }

        const selectedAccount = await this.config.accountsStorage.getAccount(address)
        if (selectedAccount == null) {
            return
        }

        class TonWalletHandler implements ITonWalletHandler {
            private readonly _address: string
            private readonly _controller: AccountController

            constructor(address: string, controller: AccountController) {
                this._address = address
                this._controller = controller
            }

            onMessageExpired(pendingTransaction: nt.PendingTransaction) {
                this._controller._rejectMessageRequest(this._address, pendingTransaction)
            }

            onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
                this._controller._resolveMessageRequest(
                    this._address,
                    pendingTransaction,
                    transaction
                )
            }

            onStateChanged(newState: nt.AccountState) {
                this._controller._updateTonWalletState(this._address, newState)
            }

            onTransactionsFound(
                transactions: Array<nt.Transaction>,
                info: nt.TransactionsBatchInfo
            ) {
                this._controller._updateTransactions(this._address, transactions, info)
            }
        }

        const subscription = await TonWalletSubscription.subscribe(
            this.config.connectionController,
            selectedAccount.tonWallet.address,
            selectedAccount.tonWallet.publicKey,
            selectedAccount.tonWallet.contractType,
            new TonWalletHandler(address, this)
        )

        this._tonWalletSubscriptions.set(address, subscription)
        this.update({
            [SELECTED_ACCOUNT]: selectedAccount,
        })
    }

    private _rejectMessageRequest(_address: string, _pendingTransaction: nt.PendingTransaction) {
        // TODO
    }

    private _resolveMessageRequest(
        _address: string,
        _pendingTransaction: nt.PendingTransaction,
        _transaction: nt.Transaction
    ) {
        // TODO
    }

    private _updateTonWalletState(address: string, state: nt.AccountState) {
        const currentStates = this.state[ACCOUNT_STATES_STORE_KEY]
        const newStates = {
            ...currentStates,
            [address]: state,
        }
        this.update({
            [ACCOUNT_STATES_STORE_KEY]: newStates,
        })
    }

    private _updateTransactions(
        address: string,
        transactions: nt.Transaction[],
        info: nt.TransactionsBatchInfo
    ) {
        const currentTransactions = this.state[ACCOUNT_TRANSACTIONS_STORE_KEY]
        const newTransactions = {
            ...currentTransactions,
            [address]: mergeTransactions(currentTransactions[address] || [], transactions, info),
        }
        this.update({
            [ACCOUNT_TRANSACTIONS_STORE_KEY]: newTransactions,
        })
    }
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
    private _releaseConnection?: () => void
    private _loopPromise?: Promise<void>
    private _refreshTimer?: number
    private _pollingInterval: number = BACKGROUND_POLLING_INTERVAL
    private _currentPollingMethod: typeof nt.TonWallet.prototype.pollingMethod
    private _isRunning: boolean = false
    private _currentBlockId?: string
    private _suggestedBlockId?: string

    public static async subscribe(
        connectionController: ConnectionController,
        address: string,
        publicKey: string,
        contractType: nt.ContractType,
        handler: ITonWalletHandler
    ) {
        const {
            connection: {
                data: { connection },
            },
            release,
        } = await connectionController.acquire()

        try {
            const tonWallet = await connection.subscribeToTonWallet(
                publicKey,
                contractType,
                handler
            )
            if (tonWallet == null) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, 'Failed to subscribe')
            }

            return new TonWalletSubscription(connection, release, address, tonWallet)
        } catch (e) {
            release()
            throw e
        }
    }

    private constructor(
        connection: nt.GqlConnection,
        release: () => void,
        address: string,
        tonWallet: nt.TonWallet
    ) {
        this._releaseConnection = release
        this._connection = connection
        this._address = address
        this._tonWallet = tonWallet
        this._currentPollingMethod = this._tonWallet.pollingMethod
    }

    public async start() {
        if (this._releaseConnection == null) {
            throw new NekotonRpcError(
                RpcErrorCode.INTERNAL,
                'Wallet subscription must not be started after being closed'
            )
        }

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

    public async pause() {
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

    public async stop() {
        await this.pause()
        this._releaseConnection?.()
        this._releaseConnection = undefined
    }

    public async prepareReliablePolling() {
        this._suggestedBlockId = (await this._connection.getLatestBlock(this._address)).id
    }
}
