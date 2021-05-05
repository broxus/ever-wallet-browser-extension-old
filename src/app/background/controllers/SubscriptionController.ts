import { NekotonRpcError, SendMessageCallback, SendMessageRequest } from '@shared/utils'
import { ContractUpdatesSubscription, ProviderEvent, ProviderEventData } from 'ton-inpage-provider'
import { RpcErrorCode } from '@shared/errors'
import { Mutex } from '@broxus/await-semaphore'
import * as nt from '@nekoton'

import { BaseConfig, BaseController, BaseState } from './BaseController'
import { ConnectionController } from './ConnectionController'

const DEFAULT_POLLING_INTERVAL = 10000 // 10s

const NEXT_BLOCK_TIMEOUT = 60 // 60s

export interface SubscriptionControllerConfig extends BaseConfig {
    connectionController: ConnectionController
    notifyTab?: <T extends ProviderEvent>(
        tabId: number,
        payload: { method: ProviderEvent; params: ProviderEventData<T> }
    ) => void
    getOriginTabs?: (origin: string) => number[]
}

export interface SubscriptionControllerState extends BaseState {
    subscriptionPendingMessages: { [address: string]: { [id: string]: SendMessageRequest } }
}

const defaultState: SubscriptionControllerState = {
    subscriptionPendingMessages: {},
}

const defaultSubscriptionState: ContractUpdatesSubscription = {
    state: false,
    transactions: false,
}

export class SubscriptionController extends BaseController<
    SubscriptionControllerConfig,
    SubscriptionControllerState
> {
    private readonly _subscriptions: Map<string, GenericContractSubscription> = new Map()
    private readonly _subscriptionsMutex: Mutex = new Mutex()
    private readonly _sendMessageRequests: Map<string, Map<string, SendMessageCallback>> = new Map()
    private readonly _tabs: Map<number, Map<string, ContractUpdatesSubscription>> = new Map()
    private readonly _subscriptionTabs: Map<string, Set<number>> = new Map()

    constructor(config: SubscriptionControllerConfig, state?: SubscriptionControllerState) {
        super(config, state || defaultState)
        this.initialize()
    }

    public async subscribeToContract(
        tabId: number,
        address: string,
        params: Partial<ContractUpdatesSubscription>
    ): Promise<ContractUpdatesSubscription> {
        return this._subscriptionsMutex.use(async () => {
            let tabSubscriptions = this._tabs.get(tabId)
            if (params == {}) {
                return tabSubscriptions?.get(address) || defaultSubscriptionState
            }

            const shouldCreateTab = tabSubscriptions == null
            if (tabSubscriptions == null) {
                tabSubscriptions = new Map()
            }

            let shouldUnsubscribe = true
            const currentParams = tabSubscriptions.get(address) || defaultSubscriptionState
            window.ObjectExt.keys(defaultSubscriptionState).map((param) => {
                const value = params[param]
                if (typeof value === 'boolean') {
                    currentParams[param] = value
                }
                shouldUnsubscribe &&= !currentParams[param]
            })

            let subscriptionTabs = this._subscriptionTabs.get(address)

            if (shouldUnsubscribe) {
                tabSubscriptions?.delete(address)
                subscriptionTabs?.delete(tabId)
                await this._tryUnsubscribe(address)
                return defaultSubscriptionState
            }

            if (subscriptionTabs == null) {
                subscriptionTabs = new Set()
            }

            let existingSubscription = this._subscriptions.get(address)
            const newSubscription = existingSubscription == null
            if (existingSubscription == null) {
                existingSubscription = await this._createSubscription(address, subscriptionTabs)
            }

            subscriptionTabs.add(tabId)
            tabSubscriptions.set(address, currentParams)
            if (shouldCreateTab) {
                this._tabs.set(tabId, tabSubscriptions)
            }

            if (newSubscription) {
                await existingSubscription.start()
            }
            return currentParams
        })
    }

    public async unsubscribeFromContract(tabId: number, address: string) {
        await this.subscribeToContract(tabId, address, {
            state: false,
            transactions: false,
        })
    }

    public async unsubscribeFromAllContracts(tabId: number) {
        const tabSubscriptions = this._tabs.get(tabId)
        if (tabSubscriptions == null) {
            return
        }
        for (const address of tabSubscriptions.keys()) {
            await this.unsubscribeFromContract(tabId, address)
        }
    }

    public async unsubscribeOriginFromAllContracts(origin: string, tabId?: number) {
        const tabIds = this.config.getOriginTabs?.(origin) || (tabId != null ? [tabId] : [])
        await Promise.all(tabIds.map(async (tabId) => this.unsubscribeFromAllContracts(tabId)))
    }

    public getTabSubscriptions(tabId: number) {
        const connectionSubscriptions = this._tabs.get(tabId)
        if (connectionSubscriptions == null) {
            return {}
        }
        return window.objectFromEntries(connectionSubscriptions)
    }

    public async stopSubscriptions() {
        const tabs = Array.from(this._tabs.keys())
        for (const tabId of tabs) {
            await this.unsubscribeFromAllContracts(tabId)
        }
        await this._clearSendMessageRequests()
    }

    public async sendMessage(address: string, signedMessage: nt.SignedMessage) {
        let messageRequests = await this._sendMessageRequests.get(address)
        if (messageRequests == null) {
            messageRequests = new Map()
            this._sendMessageRequests.set(address, messageRequests)
        }

        return new Promise<nt.Transaction>(async (resolve, reject) => {
            const id = signedMessage.bodyHash
            messageRequests!.set(id, { resolve, reject })

            const subscription = await this._subscriptionsMutex.use(async () => {
                let subscription = this._subscriptions.get(address)
                if (subscription == null) {
                    subscription = await this._createSubscription(address, new Set())
                }
                return subscription
            })

            await subscription.prepareReliablePolling()
            await subscription
                .use(async (contract) => {
                    try {
                        await contract.sendMessage(signedMessage)
                        subscription.skipRefreshTimer()
                    } catch (e) {
                        throw new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, e.toString())
                    }
                })
                .catch((e) => {
                    this._rejectMessageRequest(address, id, e)
                })
        })
    }

    private async _createSubscription(address: string, subscriptionTabs: Set<number>) {
        class ContractHandler implements IGenericContractHandler {
            private readonly _address: string
            private readonly _controller: SubscriptionController
            private _enabled: boolean = false

            constructor(address: string, controller: SubscriptionController) {
                this._address = address
                this._controller = controller
            }

            public enableNotifications() {
                this._enabled = true
            }

            onMessageExpired(pendingTransaction: nt.PendingTransaction) {
                this._enabled &&
                    this._controller
                        ._rejectMessageRequest(
                            this._address,
                            pendingTransaction.bodyHash,
                            new NekotonRpcError(RpcErrorCode.INTERNAL, 'Message expired')
                        )
                        .catch(console.error)
            }

            onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
                this._enabled &&
                    this._controller
                        ._resolveMessageRequest(
                            this._address,
                            pendingTransaction.bodyHash,
                            transaction
                        )
                        .catch(console.error)
            }

            onStateChanged(newState: nt.ContractState) {
                this._enabled && this._controller._notifyStateChanged(this._address, newState)
            }

            onTransactionsFound(
                transactions: Array<nt.Transaction>,
                info: nt.TransactionsBatchInfo
            ) {
                this._enabled &&
                    this._controller._notifyTransactionsFound(this._address, transactions, info)
            }
        }

        const handler = new ContractHandler(address, this)

        const subscription = await GenericContractSubscription.subscribe(
            this.config.connectionController,
            address,
            handler
        )
        handler.enableNotifications()
        this._subscriptions.set(address, subscription)
        this._subscriptionTabs.set(address, subscriptionTabs)

        return subscription
    }

    private async _tryUnsubscribe(address: string) {
        const subscriptionTabs = this._subscriptionTabs.get(address)
        const sendMessageRequests = this._sendMessageRequests.get(address)
        if ((subscriptionTabs?.size || 0) == 0 && (sendMessageRequests?.size || 0) == 0) {
            const subscription = this._subscriptions.get(address)
            this._subscriptions.delete(address)
            await subscription?.stop()
        }
    }

    private async _clearSendMessageRequests() {
        const rejectionError = new NekotonRpcError(
            RpcErrorCode.RESOURCE_UNAVAILABLE,
            'The request was rejected; please try again'
        )

        const addresses = Array.from(this._sendMessageRequests.keys())
        for (const address of addresses) {
            const ids = Array.from(this._sendMessageRequests.get(address)?.keys() || [])
            for (const id of ids) {
                await this._rejectMessageRequest(address, id, rejectionError)
            }
        }
        this._sendMessageRequests.clear()
    }

    private async _rejectMessageRequest(address: string, id: string, error: Error) {
        this._deleteMessageRequestAndGetCallback(address, id).reject(error)
        await this._subscriptionsMutex.use(async () => this._tryUnsubscribe(address))
    }

    private async _resolveMessageRequest(address: string, id: string, transaction: nt.Transaction) {
        this._deleteMessageRequestAndGetCallback(address, id).resolve(transaction)
        await this._subscriptionsMutex.use(async () => this._tryUnsubscribe(address))
    }

    private _deleteMessageRequestAndGetCallback(address: string, id: string): SendMessageCallback {
        const callbacks = this._sendMessageRequests.get(address)?.get(id)
        if (!callbacks) {
            throw new Error(`SendMessage request with id "${id}" not found`)
        }

        this._deleteMessageRequest(address, id)
        return callbacks
    }

    private _deleteMessageRequest(address: string, id: string) {
        const accountMessageRequests = this._sendMessageRequests.get(address)
        if (!accountMessageRequests) {
            return
        }
        accountMessageRequests.delete(id)
        if (accountMessageRequests.size === 0) {
            this._sendMessageRequests.delete(address)
        }

        const currentPendingMessages = this.state.subscriptionPendingMessages

        const newAccountPendingMessages = { ...currentPendingMessages[address] }
        delete newAccountPendingMessages[id]

        const newPendingMessages = { ...currentPendingMessages }
        if (accountMessageRequests.size > 0) {
            newPendingMessages[address] = newAccountPendingMessages
        } else {
            delete newPendingMessages[address]
        }

        this.update({
            subscriptionPendingMessages: newPendingMessages,
        })
    }

    private _notifyStateChanged(address: string, state: nt.ContractState) {
        const connections = this._subscriptionTabs.get(address)
        if (connections == null) {
            return
        }
        connections.forEach((connectionId) => {
            const notifyState = this._tabs.get(connectionId)?.get(address)?.state
            if (notifyState === true) {
                this.config.notifyTab?.(connectionId, {
                    method: 'contractStateChanged',
                    params: {
                        state,
                    },
                })
            }
        })
    }

    private _notifyTransactionsFound(
        address: string,
        transactions: nt.Transaction[],
        info: nt.TransactionsBatchInfo
    ) {
        console.log('Transactions found', transactions, info, this._subscriptionTabs)

        const connections = this._subscriptionTabs.get(address)
        if (connections == null) {
            return
        }
        connections.forEach((connectionId) => {
            const notifyTransactions = this._tabs.get(connectionId)?.get(address)?.transactions
            if (notifyTransactions === true) {
                this.config.notifyTab?.(connectionId, {
                    method: 'transactionsFound',
                    params: {
                        transactions,
                        info,
                    },
                })
            }
        })
    }
}

interface IGenericContractHandler {
    onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction): void

    onMessageExpired(pendingTransaction: nt.PendingTransaction): void

    onStateChanged(newState: nt.ContractState): void

    onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo): void
}

class GenericContractSubscription {
    private readonly _connection: nt.GqlConnection
    private readonly _address: string
    private readonly _contract: nt.GenericContract
    private readonly _contractMutex: Mutex = new Mutex()
    private _releaseConnection?: () => void
    private _loopPromise?: Promise<void>
    private _refreshTimer?: [number, () => void]
    private _pollingInterval: number = DEFAULT_POLLING_INTERVAL
    private _currentPollingMethod: typeof nt.GenericContract.prototype.pollingMethod
    private _isRunning: boolean = false
    private _currentBlockId?: string
    private _suggestedBlockId?: string

    public static async subscribe(
        connectionController: ConnectionController,
        address: string,
        handler: IGenericContractHandler
    ) {
        const {
            connection: {
                data: { connection },
            },
            release,
        } = await connectionController.acquire()

        try {
            const contract = await connection.subscribeToGenericContract(address, handler)
            if (contract == null) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, 'Failed to subscribe')
            }

            return new GenericContractSubscription(connection, release, address, contract)
        } catch (e) {
            release()
            throw e
        }
    }

    private constructor(
        connection: nt.GqlConnection,
        release: () => void,
        address: string,
        contract: nt.GenericContract
    ) {
        this._releaseConnection = release
        this._connection = connection
        this._address = address
        this._contract = contract
        this._currentPollingMethod = this._contract.pollingMethod
    }

    public setPollingInterval(interval: number) {
        this._pollingInterval = interval
    }

    public async start() {
        if (this._releaseConnection == null) {
            throw new NekotonRpcError(
                RpcErrorCode.INTERNAL,
                'Contract subscription must not be started after being closed'
            )
        }

        if (this._loopPromise) {
            console.log('GenericContractSubscription -> awaiting loop promise')
            await this._loopPromise
        }

        console.log('GenericContractSubscription -> loop started')

        this._loopPromise = new Promise<void>(async (resolve) => {
            this._isRunning = true
            outer: while (this._isRunning) {
                switch (this._currentPollingMethod) {
                    case 'manual': {
                        this._currentBlockId = undefined

                        console.log('GenericContractSubscription -> manual -> waiting begins')

                        await new Promise<void>((resolve) => {
                            const timerHandle = window.setTimeout(() => {
                                this._refreshTimer = undefined
                                resolve()
                            }, this._pollingInterval)
                            this._refreshTimer = [timerHandle, resolve]
                        })

                        console.log('GenericContractSubscription -> manual -> waining ends')

                        if (!this._isRunning) {
                            break outer
                        }

                        console.log('GenericContractSubscription -> manual -> refreshing begins')
                        await this._contractMutex.use(async () => {
                            await this._contract.refresh()
                            this._currentPollingMethod = this._contract.pollingMethod
                        })
                        console.log('GenericContractSubscription -> manual -> refreshing ends')

                        break
                    }
                    case 'reliable': {
                        console.log('GenericContractSubscription -> reliable start')

                        if (this._suggestedBlockId != null) {
                            this._currentBlockId = this._suggestedBlockId
                            this._suggestedBlockId = undefined
                        }

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

                        await this._contractMutex.use(async () => {
                            await this._contract.handleBlock(nextBlockId)
                            this._currentPollingMethod = this._contract.pollingMethod
                            this._currentBlockId = nextBlockId
                        })
                        break
                    }
                }
            }

            console.log('GenericContractSubscription -> loop finished')

            resolve()
        })
    }

    public skipRefreshTimer() {
        window.clearTimeout(this._refreshTimer?.[0])
        this._refreshTimer?.[1]()
        this._refreshTimer = undefined
    }

    public async pause() {
        if (!this._isRunning) {
            return
        }

        this._isRunning = false

        this.skipRefreshTimer()

        await this._loopPromise
        this._loopPromise = undefined

        this._currentPollingMethod = await this._contractMutex.use(async () => {
            return this._contract.pollingMethod
        })

        this._currentBlockId = undefined
        this._suggestedBlockId = undefined
    }

    public async stop() {
        await this.pause()
        this._contract.free()
        this._releaseConnection?.()
        this._releaseConnection = undefined
    }

    public async prepareReliablePolling() {
        try {
            this._suggestedBlockId = (await this._connection.getLatestBlock(this._address)).id
        } catch (e) {
            throw new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, e.toString())
        }
    }

    public async use<T>(f: (contract: nt.GenericContract) => Promise<T>) {
        const release = await this._contractMutex.acquire()
        return f(this._contract)
            .then((res) => {
                release()
                return res
            })
            .catch((err) => {
                release()
                throw err
            })
    }
}
