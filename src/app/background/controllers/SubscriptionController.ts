import { NekotonRpcError, SendMessageCallback } from '@shared/utils'
import {
    ContractUpdatesSubscription,
    ProviderEvent,
    RawProviderEventData,
} from 'everscale-inpage-provider'
import { RpcErrorCode } from '@shared/errors'
import { Mutex } from '@broxus/await-semaphore'
import * as nt from '@nekoton'

import { BaseConfig, BaseController, BaseState } from './BaseController'
import { ConnectionController } from './ConnectionController'
import { ContractSubscription, IContractHandler } from '../utils/ContractSubscription'

const DEFAULT_POLLING_INTERVAL = 10000 // 10s

export interface SubscriptionControllerConfig extends BaseConfig {
    clock: nt.ClockWithOffset
    connectionController: ConnectionController
    notifyTab?: <T extends ProviderEvent>(
        tabId: number,
        payload: { method: T; params: RawProviderEventData<T> }
    ) => void
    getOriginTabs?: (origin: string) => number[]
}

export interface SubscriptionControllerState extends BaseState {}

function makeDefaultState(): SubscriptionControllerState {
    return {}
}

function makeDefaultSubscriptionState(): ContractUpdatesSubscription {
    return {
        state: false,
        transactions: false,
    }
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
        super(config, state || makeDefaultState())
        this.initialize()
    }

    public async subscribeToContract(
        tabId: number,
        address: string,
        params: Partial<ContractUpdatesSubscription>
    ): Promise<ContractUpdatesSubscription> {
        return this._subscriptionsMutex.use(async () => {
            let tabSubscriptions = this._tabs.get(tabId)
            if (window.ObjectExt.keys(params).length == 0) {
                return tabSubscriptions?.get(address) || makeDefaultSubscriptionState()
            }

            const shouldCreateTab = tabSubscriptions == null
            if (tabSubscriptions == null) {
                tabSubscriptions = new Map()
            }

            let shouldUnsubscribe = true
            const currentParams = tabSubscriptions.get(address) || makeDefaultSubscriptionState()
            window.ObjectExt.keys(currentParams).map((param) => {
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
                return currentParams
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

    public async sendMessageLocally(
        tabId: number,
        address: string,
        signedMessage: nt.SignedMessage
    ): Promise<nt.Transaction> {
        await this.subscribeToContract(tabId, address, { state: true })
        const subscription = this._subscriptions.get(address)
        if (subscription == null) {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                'Failed to subscribe to contract'
            )
        }

        return await subscription.use(async (contract) => {
            try {
                return await contract.sendMessageLocally(signedMessage)
            } catch (e: any) {
                throw new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, e.toString())
            }
        })
    }

    public async sendMessage(tabId: number, address: string, signedMessage: nt.SignedMessage) {
        let messageRequests = await this._sendMessageRequests.get(address)
        if (messageRequests == null) {
            messageRequests = new Map()
            this._sendMessageRequests.set(address, messageRequests)
        }

        return new Promise<nt.Transaction>(async (resolve, reject) => {
            const id = signedMessage.hash
            messageRequests!.set(id, { resolve, reject })

            await this.subscribeToContract(tabId, address, { state: true })
            const subscription = this._subscriptions.get(address)
            if (subscription == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.RESOURCE_UNAVAILABLE,
                    'Failed to subscribe to contract'
                )
            }

            await subscription.prepareReliablePolling()
            await subscription
                .use(async (contract) => {
                    try {
                        await contract.sendMessage(signedMessage)
                        subscription.skipRefreshTimer()
                    } catch (e: any) {
                        throw new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, e.toString())
                    }
                })
                .catch((e) => {
                    this._rejectMessageRequest(address, id, e)
                })
        })
    }

    private async _createSubscription(address: string, subscriptionTabs: Set<number>) {
        class ContractHandler implements IContractHandler<nt.Transaction> {
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
                            pendingTransaction.messageHash,
                            new NekotonRpcError(RpcErrorCode.INTERNAL, 'Message expired')
                        )
                        .catch(console.error)
            }

            onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
                this._enabled &&
                    this._controller
                        ._resolveMessageRequest(
                            this._address,
                            pendingTransaction.messageHash,
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
            this.config.clock,
            this.config.connectionController,
            address,
            handler
        )
        subscription.setPollingInterval(DEFAULT_POLLING_INTERVAL)
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
                        address,
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
        console.debug('Transactions found', transactions, info, this._subscriptionTabs)

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
                        address,
                        transactions,
                        info,
                    },
                })
            }
        })
    }
}

class GenericContractSubscription extends ContractSubscription<nt.GenericContract> {
    public static async subscribe(
        clock: nt.ClockWithOffset,
        connectionController: ConnectionController,
        address: string,
        handler: IContractHandler<nt.Transaction>
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

            return new GenericContractSubscription(clock, connection, release, address, contract)
        } catch (e: any) {
            release()
            throw e
        }
    }
}
