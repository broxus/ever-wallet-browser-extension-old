import _ from 'lodash'
import { Mutex } from '@broxus/await-semaphore'
import { mergeTransactions } from 'ton-inpage-provider'
import {
    convertAddress,
    convertTons,
    extractTransactionAddress,
    extractTransactionValue,
    NekotonRpcError,
    SendMessageCallback,
    SendMessageRequest,
} from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'
import { AccountToCreate, MessageToPrepare } from '@shared/approvalApi'
import * as nt from '@nekoton'

import { BaseConfig, BaseController, BaseState } from '../BaseController'
import { ConnectionController } from '../ConnectionController'
import { NotificationController } from '../NotificationController'

import { DEFAULT_POLLING_INTERVAL, BACKGROUND_POLLING_INTERVAL } from './constants'
import { ITonWalletHandler, TonWalletSubscription } from './TonWalletSubscription'

export interface AccountControllerConfig extends BaseConfig {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
    connectionController: ConnectionController
    notificationController: NotificationController
}

export interface AccountControllerState extends BaseState {
    selectedAccount: nt.AssetsList | undefined
    accountEntries: { [publicKey: string]: nt.AccountsStorageEntry[] }
    accountContractStates: { [address: string]: nt.ContractState }
    accountTransactions: { [address: string]: nt.Transaction[] }
    accountPendingMessages: { [address: string]: { [id: string]: SendMessageRequest } }
}

const defaultState: AccountControllerState = {
    selectedAccount: undefined,
    accountEntries: {},
    accountContractStates: {},
    accountTransactions: {},
    accountPendingMessages: {},
}

export class AccountController extends BaseController<
    AccountControllerConfig,
    AccountControllerState
> {
    private readonly _tonWalletSubscriptions: Map<string, TonWalletSubscription> = new Map()
    private readonly _sendMessageRequests: Map<string, Map<string, SendMessageCallback>> = new Map()
    private readonly _accountsMutex = new Mutex()

    constructor(config: AccountControllerConfig, state?: AccountControllerState) {
        super(config, state || _.cloneDeep(defaultState))

        this.initialize()
    }

    public async initialSync() {
        const address = await this.config.accountsStorage.getCurrentAccount()
        let selectedAccount: AccountControllerState['selectedAccount'] = undefined
        if (address != null) {
            selectedAccount = await this.config.accountsStorage.getAccount(address)
        }

        const accountEntries: AccountControllerState['accountEntries'] = {}
        const entries = await this.config.accountsStorage.getStoredAccounts()
        for (const entry of entries) {
            let item = accountEntries[entry.publicKey]
            if (item == null) {
                item = []
                accountEntries[entry.publicKey] = item
            }
            item.push(entry)
        }

        this.update({
            selectedAccount,
            accountEntries,
        })
    }

    public async startSubscriptions() {
        console.debug('startSubscriptions')

        await this._accountsMutex.use(async () => {
            console.debug('startSubscriptions -> mutex gained')

            const accountEntries = this.state.accountEntries
            const iterateEntries = async (f: (entry: nt.AccountsStorageEntry) => void) =>
                Promise.all(
                    window.ObjectExt.values(accountEntries).map((entries) =>
                        Promise.all(entries.map(f))
                    )
                )

            await iterateEntries(async ({ address, publicKey, contractType }) => {
                console.debug(
                    `iterateEntries -> ${address}, ${contractType}, ${this._tonWalletSubscriptions.get(
                        address
                    )}`
                )

                if (this._tonWalletSubscriptions.get(address) == null) {
                    console.debug('iterateEntries -> subscribing')
                    const subscription = await this._createSubscription(
                        address,
                        publicKey,
                        contractType
                    )
                    console.debug('iterateEntries -> subscribed')

                    this._tonWalletSubscriptions.set(address, subscription)
                    subscription?.setPollingInterval(BACKGROUND_POLLING_INTERVAL)

                    console.debug('iterateEntries -> start')
                    await subscription?.start()

                    console.debug('iterateEntries -> started')
                }
            })

            console.debug('startSubscriptions -> mutex released')
        })
    }

    public async stopSubscriptions() {
        console.debug('stopSubscriptions')

        await this._accountsMutex.use(async () => {
            console.debug('stopSubscriptions -> mutex gained')
            await this._stopSubscriptions()
            console.debug('stopSubscriptions -> mutex released')
        })
    }

    public async useSubscription<T>(address: string, f: (wallet: nt.TonWallet) => Promise<T>) {
        const subscription = this._tonWalletSubscriptions.get(address)
        if (!subscription) {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                `There is no subscription for address ${address}`
            )
        }
        return subscription.use(f)
    }

    public async logOut() {
        console.debug('logOut')
        await this._accountsMutex.use(async () => {
            console.debug('logOut -> mutex gained')

            await this._stopSubscriptions()
            await this.config.accountsStorage.clear()
            await this.config.keyStore.clear()
            this.update(_.cloneDeep(defaultState), true)

            console.debug('logOut -> mutex released')
        })
    }

    public async createAccount({
        name,
        contractType,
        seed,
        password,
    }: AccountToCreate): Promise<nt.AssetsList> {
        const { keyStore, accountsStorage } = this.config

        try {
            const { publicKey } = await keyStore.addKey(`${name} key`, <nt.NewKey>{
                type: 'encrypted_key',
                data: {
                    password,
                    phrase: seed.phrase,
                    mnemonicType: seed.mnemonicType,
                },
            })

            const selectedAccount = await accountsStorage.addAccount(
                name,
                publicKey,
                contractType,
                true
            )

            const accountEntries = this.state.accountEntries
            let entries = accountEntries[publicKey]
            if (entries == null) {
                entries = []
                accountEntries[publicKey] = entries
            }
            entries.push({
                address: selectedAccount.tonWallet.address,
                publicKey,
                contractType,
                name,
            })

            this.update({
                selectedAccount,
                accountEntries,
            })

            await this.startSubscriptions()
            return selectedAccount
        } catch (e) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, e.toString())
        }
    }

    public async selectAccount(address: string) {
        console.debug('selectAccount')

        await this._accountsMutex.use(async () => {
            console.debug('selectAccount -> mutex gained')

            const selectedAccount = await this.config.accountsStorage.setCurrentAccount(address)
            this.update({
                selectedAccount,
            })

            console.debug('selectAccount -> mutex released')
        })
    }

    public async removeAccount(address: string) {
        await this._accountsMutex.use(async () => {
            const assetsList = await this.config.accountsStorage.removeAccount(address)
            const subscription = this._tonWalletSubscriptions.get(address)
            this._tonWalletSubscriptions.delete(address)
            if (subscription != null) {
                await subscription.stop()
            }

            const accountEntries = { ...this.state.accountEntries }
            if (assetsList != null) {
                const publicKey = assetsList.tonWallet.publicKey

                let entries = [...(accountEntries[publicKey] || [])]
                const index = entries.findIndex((item) => item.address == address)
                entries.splice(index, 1)

                if (entries.length === 0) {
                    delete accountEntries[publicKey]
                }
            }

            const accountContractStates = { ...this.state.accountContractStates }
            delete accountContractStates[address]

            const accountTransactions = { ...this.state.accountTransactions }
            delete accountTransactions[address]

            // TODO: select current account

            this.update({
                accountEntries,
                accountContractStates,
                accountTransactions,
            })
        })
    }

    public async checkPassword(password: nt.KeyPassword) {
        return this.config.keyStore.check_password(password)
    }

    public async estimateFees(address: string, params: MessageToPrepare) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireSubscription(address, subscription)

        return subscription.use(async (wallet) => {
            const contractState = await wallet.getContractState()
            if (contractState == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.RESOURCE_UNAVAILABLE,
                    `Failed to get contract state for ${address}`
                )
            }

            const unsignedMessage = wallet.prepareTransfer(
                contractState,
                params.recipient,
                params.amount,
                false,
                params.payload || '',
                60
            )
            if (unsignedMessage == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.RESOURCE_UNAVAILABLE,
                    'Contract must be deployed first'
                )
            }

            try {
                const signedMessage = unsignedMessage.signFake()
                return await wallet.estimateFees(signedMessage)
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
            } finally {
                unsignedMessage.free()
            }
        })
    }

    public async estimateDeploymentFees(address: string) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireSubscription(address, subscription)

        return subscription.use(async (wallet) => {
            const contractState = await wallet.getContractState()
            if (contractState == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.RESOURCE_UNAVAILABLE,
                    `Failed to get contract state for ${address}`
                )
            }

            const unsignedMessage = wallet.prepareDeploy(60)

            try {
                const signedMessage = unsignedMessage.signFake()
                return await wallet.estimateFees(signedMessage)
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
            } finally {
                unsignedMessage.free()
            }
        })
    }

    public async prepareMessage(
        address: string,
        params: MessageToPrepare,
        password: nt.KeyPassword
    ) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireSubscription(address, subscription)

        return subscription.use(async (wallet) => {
            const contractState = await wallet.getContractState()
            if (contractState == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.RESOURCE_UNAVAILABLE,
                    `Failed to get contract state for ${address}`
                )
            }

            const unsignedMessage = wallet.prepareTransfer(
                contractState,
                params.recipient,
                params.amount,
                false,
                params.payload || '',
                60
            )
            if (unsignedMessage == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.RESOURCE_UNAVAILABLE,
                    'Contract must be deployed first'
                )
            }

            try {
                return await this.config.keyStore.sign(unsignedMessage, password)
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
            } finally {
                unsignedMessage.free()
            }
        })
    }

    public async prepareDeploymentMessage(address: string, password: nt.KeyPassword) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireSubscription(address, subscription)

        return subscription.use(async (wallet) => {
            const contractState = await wallet.getContractState()
            if (contractState == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.RESOURCE_UNAVAILABLE,
                    `Failed to get contract state for ${address}`
                )
            }

            const unsignedMessage = wallet.prepareDeploy(60)
            try {
                return await this.config.keyStore.sign(unsignedMessage, password)
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
            } finally {
                unsignedMessage.free()
            }
        })
    }

    public async signPreparedMessage(
        unsignedMessage: nt.UnsignedMessage,
        password: nt.KeyPassword
    ) {
        return this.config.keyStore.sign(unsignedMessage, password)
    }

    public async sendMessage(address: string, signedMessage: nt.SignedMessage) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireSubscription(address, subscription)

        let accountMessageRequests = await this._sendMessageRequests.get(address)
        if (accountMessageRequests == null) {
            accountMessageRequests = new Map()
            this._sendMessageRequests.set(address, accountMessageRequests)
        }

        return new Promise<nt.Transaction>(async (resolve, reject) => {
            const id = signedMessage.bodyHash
            accountMessageRequests!.set(id, { resolve, reject })

            await subscription.prepareReliablePolling()
            await this.useSubscription(address, async (wallet) => {
                try {
                    await wallet.sendMessage(signedMessage)
                    subscription.skipRefreshTimer()
                } catch (e) {
                    throw new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, e.toString())
                }
            }).catch((e) => {
                this._rejectMessageRequest(address, id, e)
            })
        })
    }

    public async preloadTransactions(address: string, lt: string, hash: string) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireSubscription(address, subscription)

        await subscription.use(async (wallet) => {
            try {
                await wallet.preloadTransactions(lt, hash)
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, e.toString())
            }
        })
    }

    public enableIntensivePolling() {
        console.debug('Enable intensive polling')
        this._tonWalletSubscriptions.forEach((subscription) => {
            subscription.skipRefreshTimer()
            subscription.setPollingInterval(DEFAULT_POLLING_INTERVAL)
        })
    }

    public disableIntensivePolling() {
        console.debug('Disable intensive polling')
        this._tonWalletSubscriptions.forEach((subscription) => {
            subscription.setPollingInterval(BACKGROUND_POLLING_INTERVAL)
        })
    }

    private async _createSubscription(
        address: string,
        publicKey: string,
        contractType: nt.ContractType
    ) {
        class TonWalletHandler implements ITonWalletHandler {
            private readonly _address: string
            private readonly _controller: AccountController

            constructor(address: string, controller: AccountController) {
                this._address = address
                this._controller = controller
            }

            onMessageExpired(pendingTransaction: nt.PendingTransaction) {
                this._controller._rejectMessageRequest(
                    this._address,
                    pendingTransaction.bodyHash,
                    new NekotonRpcError(RpcErrorCode.INTERNAL, 'Message expired')
                )
            }

            onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
                this._controller._resolveMessageRequest(
                    this._address,
                    pendingTransaction.bodyHash,
                    transaction
                )
            }

            onStateChanged(newState: nt.ContractState) {
                this._controller._updateTonWalletState(this._address, newState)
            }

            onTransactionsFound(
                transactions: Array<nt.Transaction>,
                info: nt.TransactionsBatchInfo
            ) {
                if (info.batchType == 'new') {
                    let body = ''
                    for (const transaction of transactions) {
                        const value = extractTransactionValue(transaction)
                        const { address, direction } = extractTransactionAddress(transaction)

                        body += `${convertTons(value.toString())} TON ${direction} ${convertAddress(
                            address
                        )}\n`
                    }

                    if (body.length !== 0) {
                        this._controller.config.notificationController.showNotification(
                            `New transaction${transactions.length == 1 ? '' : 's'} found`,
                            body
                        )
                    }
                }

                this._controller._updateTransactions(this._address, transactions, info)
            }
        }

        return await TonWalletSubscription.subscribe(
            this.config.connectionController,
            address,
            publicKey,
            contractType,
            new TonWalletHandler(address, this)
        )
    }

    private async _stopSubscriptions() {
        await Promise.all(
            Array.from(this._tonWalletSubscriptions.values()).map(async (item) => {
                await item.stop()
            })
        )
        this._tonWalletSubscriptions.clear()
        this._clearSendMessageRequests()
    }

    private _clearSendMessageRequests() {
        const rejectionError = new NekotonRpcError(
            RpcErrorCode.RESOURCE_UNAVAILABLE,
            'The request was rejected; please try again'
        )

        const addresses = Array.from(this._sendMessageRequests.keys())
        for (const address of addresses) {
            const ids = Array.from(this._sendMessageRequests.get(address)?.keys() || [])
            for (const id of ids) {
                this._rejectMessageRequest(address, id, rejectionError)
            }
        }
        this._sendMessageRequests.clear()
    }

    private _rejectMessageRequest(address: string, id: string, error: Error) {
        this._deleteMessageRequestAndGetCallback(address, id).reject(error)
    }

    private _resolveMessageRequest(address: string, id: string, transaction: nt.Transaction) {
        this._deleteMessageRequestAndGetCallback(address, id).resolve(transaction)
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

        const currentPendingMessages = this.state.accountPendingMessages

        const newAccountPendingMessages = { ...currentPendingMessages[address] }
        delete newAccountPendingMessages[id]

        const newPendingMessages = { ...currentPendingMessages }
        if (accountMessageRequests.size > 0) {
            newPendingMessages[address] = newAccountPendingMessages
        } else {
            delete newPendingMessages[address]
        }

        this.update({
            accountPendingMessages: newPendingMessages,
        })
    }

    private _updateTonWalletState(address: string, state: nt.ContractState) {
        const currentStates = this.state.accountContractStates
        const newStates = {
            ...currentStates,
            [address]: state,
        }
        this.update({
            accountContractStates: newStates,
        })
    }

    private _updateTransactions(
        address: string,
        transactions: nt.Transaction[],
        info: nt.TransactionsBatchInfo
    ) {
        const currentTransactions = this.state.accountTransactions
        const newTransactions = {
            ...currentTransactions,
            [address]: mergeTransactions(currentTransactions[address] || [], transactions, info),
        }
        this.update({
            accountTransactions: newTransactions,
        })
    }
}

function requireSubscription(
    address: string,
    subscription?: TonWalletSubscription
): asserts subscription is TonWalletSubscription {
    if (!subscription) {
        throw new NekotonRpcError(
            RpcErrorCode.RESOURCE_UNAVAILABLE,
            `There is no subscription for address ${address}`
        )
    }
}
