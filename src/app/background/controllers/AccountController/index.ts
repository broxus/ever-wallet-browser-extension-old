import _ from 'lodash'
import { Mutex } from '@broxus/await-semaphore'
import { mergeTransactions } from 'ton-inpage-provider'
import {
    convertAddress,
    convertCurrency,
    convertTons,
    extractTokenTransactionAddress,
    extractTokenTransactionValue,
    extractTransactionAddress,
    extractTransactionValue,
    NekotonRpcError,
    SendMessageCallback,
    SendMessageRequest,
    TokenWalletState,
} from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'
import {
    AccountToCreate,
    KeyToDerive,
    KeyToRemove,
    MasterKeyToCreate,
    MessageToPrepare,
    SwapBackMessageToPrepare,
    TokenMessageToPrepare,
    TokenWalletsToUpdate,
} from '@shared/approvalApi'
import * as nt from '@nekoton'

import { BaseConfig, BaseController, BaseState } from '../BaseController'
import { ConnectionController } from '../ConnectionController'
import { NotificationController } from '../NotificationController'

import { DEFAULT_POLLING_INTERVAL, BACKGROUND_POLLING_INTERVAL } from './constants'
import { TonWalletSubscription } from './TonWalletSubscription'
import { ITokenWalletHandler, TokenWalletSubscription } from './TokenWalletSubscription'
import { IContractHandler } from '../../utils/ContractSubscription'

export interface AccountControllerConfig extends BaseConfig {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
    connectionController: ConnectionController
    notificationController: NotificationController
}

export interface AccountControllerState extends BaseState {
    selectedAccount: nt.AssetsList | undefined
    accountEntries: { [publicKey: string]: nt.AssetsList[] }
    accountContractStates: { [address: string]: nt.ContractState }
    accountTokenStates: { [address: string]: { [rootTokenContract: string]: TokenWalletState } }
    accountTransactions: { [address: string]: nt.TonWalletTransaction[] }
    accountTokenTransactions: {
        [address: string]: { [rootTokenContract: string]: nt.TokenWalletTransaction[] }
    }
    accountPendingMessages: { [address: string]: { [id: string]: SendMessageRequest } }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
}

const defaultState: AccountControllerState = {
    selectedAccount: undefined,
    accountEntries: {},
    accountContractStates: {},
    accountTokenStates: {},
    accountTransactions: {},
    accountTokenTransactions: {},
    accountPendingMessages: {},
    knownTokens: {},
    storedKeys: {},
}

export class AccountController extends BaseController<
    AccountControllerConfig,
    AccountControllerState
> {
    private readonly _tonWalletSubscriptions: Map<string, TonWalletSubscription> = new Map()
    private readonly _tokenWalletSubscriptions: Map<
        string,
        Map<string, TokenWalletSubscription>
    > = new Map()
    private readonly _sendMessageRequests: Map<string, Map<string, SendMessageCallback>> = new Map()
    private readonly _accountsMutex = new Mutex()

    constructor(config: AccountControllerConfig, state?: AccountControllerState) {
        super(config, state || _.cloneDeep(defaultState))

        this.initialize()
    }

    public async initialSync() {
        const keyStoreEntries = await this.config.keyStore.getKeys()
        const storedKeys: typeof defaultState.storedKeys = {}
        for (const entry of keyStoreEntries) {
            storedKeys[entry.publicKey] = entry
        }

        const address = await this.config.accountsStorage.getCurrentAccount()
        let selectedAccount: AccountControllerState['selectedAccount'] = undefined
        if (address != null) {
            selectedAccount = await this.config.accountsStorage.getAccount(address)
        }

        const accountEntries: AccountControllerState['accountEntries'] = {}
        const entries = await this.config.accountsStorage.getStoredAccounts()
        for (const entry of entries) {
            let item = accountEntries[entry.tonWallet.publicKey]
            if (item == null) {
                item = []
                accountEntries[entry.tonWallet.publicKey] = item
            }
            item.push(entry)
        }

        this.update({
            selectedAccount,
            accountEntries,
            storedKeys,
        })
    }

    public async startSubscriptions() {
        console.debug('startSubscriptions')

        await this._accountsMutex.use(async () => {
            console.debug('startSubscriptions -> mutex gained')

            const accountEntries = this.state.accountEntries
            const iterateEntries = async (f: (entry: nt.AssetsList) => void) =>
                Promise.all(
                    window.ObjectExt.values(accountEntries).map((entries) =>
                        Promise.all(entries.map(f))
                    )
                )

            await iterateEntries(async ({ tonWallet, tokenWallets }) => {
                await this._createTonWalletSubscription(
                    tonWallet.address,
                    tonWallet.publicKey,
                    tonWallet.contractType
                )

                await Promise.all(
                    tokenWallets.map(async ({ rootTokenContract }) => {
                        await this._createTokenWalletSubscription(
                            tonWallet.address,
                            rootTokenContract
                        )
                    })
                )
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

    public async useTonWallet<T>(address: string, f: (wallet: nt.TonWallet) => Promise<T>) {
        const subscription = this._tonWalletSubscriptions.get(address)
        if (!subscription) {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                `There is no ton wallet subscription for address ${address}`
            )
        }
        return subscription.use(f)
    }

    public async useTokenWallet<T>(
        owner: string,
        rootTokenContract: string,
        f: (wallet: nt.TokenWallet) => Promise<T>
    ) {
        const subscription = this._tokenWalletSubscriptions.get(owner)?.get(rootTokenContract)
        if (!subscription) {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                `There is no token wallet subscription for address ${owner} for root ${rootTokenContract}`
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

    public async createMasterKey({ seed, password }: MasterKeyToCreate): Promise<nt.KeyStoreEntry> {
        const { keyStore } = this.config

        try {
            const newKey: nt.NewKey =
                seed.mnemonicType.type == 'labs'
                    ? {
                          type: 'master_key',
                          data: {
                              password,
                              params: {
                                  phrase: seed.phrase,
                              },
                          },
                      }
                    : {
                          type: 'encrypted_key',
                          data: {
                              password,
                              phrase: seed.phrase,
                              mnemonicType: seed.mnemonicType,
                          },
                      }

            const entry = await keyStore.addKey(newKey)

            this.update({
                storedKeys: {
                    ...this.state.storedKeys,
                    [entry.publicKey]: entry,
                },
            })

            return entry
        } catch (e) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, e.toString())
        }
    }

    public async createDerivedKey({ accountId, password }: KeyToDerive): Promise<nt.KeyStoreEntry> {
        const { keyStore } = this.config

        try {
            const entry = await keyStore.addKey({
                type: 'master_key',
                data: {
                    password,
                    params: { accountId },
                },
            })

            this.update({
                storedKeys: {
                    ...this.state.storedKeys,
                    [entry.publicKey]: entry,
                },
            })

            return entry
        } catch (e) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, e.toString())
        }
    }

    public async removeKey({ publicKey }: KeyToRemove): Promise<nt.KeyStoreEntry | undefined> {
        const { keyStore } = this.config

        try {
            const entry = await keyStore.removeKey(publicKey)

            const storedKeys = { ...this.state.storedKeys }
            delete storedKeys[publicKey]

            this.update({
                storedKeys,
            })

            return entry
        } catch (e) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, e.toString())
        }
    }

    public async createAccount({
        name,
        publicKey,
        contractType,
    }: AccountToCreate): Promise<nt.AssetsList> {
        const { accountsStorage } = this.config

        try {
            const storedKeys = this.state.storedKeys
            if (storedKeys[publicKey] == null) {
                throw new Error('Requested key not found')
            }

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
            entries.push(selectedAccount)

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

            const tokenSubscriptions = this._tokenWalletSubscriptions.get(address)
            this._tokenWalletSubscriptions.delete(address)
            if (tokenSubscriptions != null) {
                await Promise.all(
                    Array.from(tokenSubscriptions.values()).map(async (item) => await item.stop())
                )
            }

            const accountEntries = { ...this.state.accountEntries }
            if (assetsList != null) {
                const publicKey = assetsList.tonWallet.publicKey

                let entries = [...(accountEntries[publicKey] || [])]
                const index = entries.findIndex((item) => item.tonWallet.address == address)
                entries.splice(index, 1)

                if (entries.length === 0) {
                    delete accountEntries[publicKey]
                }
            }

            const accountContractStates = { ...this.state.accountContractStates }
            delete accountContractStates[address]

            const accountTransactions = { ...this.state.accountTransactions }
            delete accountTransactions[address]

            const accountTokenTransactions = { ...this.state.accountTokenTransactions }
            delete accountTokenTransactions[address]

            // TODO: select current account

            this.update({
                accountEntries,
                accountContractStates,
                accountTransactions,
                accountTokenTransactions,
            })
        })
    }

    public async updateTokenWallets(address: string, params: TokenWalletsToUpdate): Promise<void> {
        const { accountsStorage } = this.config

        try {
            await this._accountsMutex.use(async () => {
                await Promise.all(
                    Object.entries(params).map(
                        async ([rootTokenContract, enabled]: readonly [string, boolean]) => {
                            if (enabled) {
                                await this._createTokenWalletSubscription(
                                    address,
                                    rootTokenContract
                                )
                                await accountsStorage.addTokenWallet(address, rootTokenContract)
                            } else {
                                const tokenSubscriptions = this._tokenWalletSubscriptions.get(
                                    address
                                )
                                const subscription = tokenSubscriptions?.get(rootTokenContract)
                                if (subscription != null) {
                                    tokenSubscriptions?.delete(rootTokenContract)
                                    await subscription.stop()
                                }
                                await accountsStorage.removeTokenWallet(address, rootTokenContract)
                            }
                        }
                    )
                )

                const tokenSubscriptions = this._tokenWalletSubscriptions.get(address)

                const accountTokenTransactions = this.state.accountTokenTransactions
                const ownerTokenTransactions = {
                    ...accountTokenTransactions[address],
                }

                const currentTokenContracts = Object.keys(ownerTokenTransactions)
                for (const rootTokenContract of currentTokenContracts) {
                    if (tokenSubscriptions?.get(rootTokenContract) == null) {
                        delete ownerTokenTransactions[rootTokenContract]
                    }
                }

                if ((tokenSubscriptions?.size || 0) == 0) {
                    delete accountTokenTransactions[address]
                } else {
                    accountTokenTransactions[address] = ownerTokenTransactions
                }

                this.update({
                    accountTokenTransactions,
                })

                const assetsList = await accountsStorage.getAccount(address)
                assetsList && this._updateAssetsList(assetsList)
            })
        } catch (e) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, e.toString())
        }
    }

    public async checkPassword(password: nt.KeyPassword) {
        return this.config.keyStore.check_password(password)
    }

    public async estimateFees(address: string, params: MessageToPrepare) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireTonWalletSubscription(address, subscription)

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
        requireTonWalletSubscription(address, subscription)

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
        requireTonWalletSubscription(address, subscription)

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
        requireTonWalletSubscription(address, subscription)

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

    public async prepareTokenMessage(
        owner: string,
        rootTokenContract: string,
        params: TokenMessageToPrepare
    ) {
        const subscription = await this._tokenWalletSubscriptions.get(owner)?.get(rootTokenContract)
        requireTokenWalletSubscription(owner, rootTokenContract, subscription)

        console.log(params)

        return subscription.use(async (wallet) => {
            try {
                return await wallet.prepareTransfer(
                    params.recipient,
                    params.amount,
                    params.notifyReceiver
                )
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
            }
        })
    }

    public async prepareSwapBackMessage(
        owner: string,
        rootTokenContract: string,
        params: SwapBackMessageToPrepare
    ) {
        const subscription = await this._tokenWalletSubscriptions.get(owner)?.get(rootTokenContract)
        requireTokenWalletSubscription(owner, rootTokenContract, subscription)

        return subscription.use(async (wallet) => {
            if (params.proxyAddress == null) {
                params.proxyAddress = await wallet.getProxyAddress()
            }

            try {
                return await wallet.prepareSwapBack(
                    params.ethAddress,
                    params.amount,
                    params.proxyAddress
                )
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
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
        requireTonWalletSubscription(address, subscription)

        let accountMessageRequests = await this._sendMessageRequests.get(address)
        if (accountMessageRequests == null) {
            accountMessageRequests = new Map()
            this._sendMessageRequests.set(address, accountMessageRequests)
        }

        return new Promise<nt.Transaction>(async (resolve, reject) => {
            const id = signedMessage.bodyHash
            accountMessageRequests!.set(id, { resolve, reject })

            await subscription.prepareReliablePolling()
            await this.useTonWallet(address, async (wallet) => {
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
        requireTonWalletSubscription(address, subscription)

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
        this._tokenWalletSubscriptions.forEach((subscriptions) => {
            subscriptions.forEach((subscription) => {
                subscription.skipRefreshTimer()
                subscription.setPollingInterval(DEFAULT_POLLING_INTERVAL)
            })
        })
    }

    public disableIntensivePolling() {
        console.debug('Disable intensive polling')
        this._tonWalletSubscriptions.forEach((subscription) => {
            subscription.setPollingInterval(BACKGROUND_POLLING_INTERVAL)
        })
        this._tokenWalletSubscriptions.forEach((subscriptions) => {
            subscriptions.forEach((subscription) => {
                subscription.setPollingInterval(BACKGROUND_POLLING_INTERVAL)
            })
        })
    }

    private async _createTonWalletSubscription(
        address: string,
        publicKey: string,
        contractType: nt.ContractType
    ) {
        if (this._tonWalletSubscriptions.get(address) != null) {
            return
        }

        class TonWalletHandler implements IContractHandler<nt.TonWalletTransaction> {
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
                transactions: Array<nt.TonWalletTransaction>,
                info: nt.TransactionsBatchInfo
            ) {
                this._controller._updateTransactions(this._address, transactions, info)
            }
        }

        console.debug('_createTonWalletSubscription -> subscribing to ton wallet')
        const subscription = await TonWalletSubscription.subscribe(
            this.config.connectionController,
            publicKey,
            contractType,
            new TonWalletHandler(address, this)
        )
        console.debug('_createTonWalletSubscription -> subscribed to ton wallet')

        this._tonWalletSubscriptions.set(address, subscription)
        subscription?.setPollingInterval(BACKGROUND_POLLING_INTERVAL)

        await subscription?.start()
    }

    private async _createTokenWalletSubscription(owner: string, rootTokenContract: string) {
        let ownerSubscriptions = this._tokenWalletSubscriptions.get(owner)
        if (ownerSubscriptions == null) {
            ownerSubscriptions = new Map()
            this._tokenWalletSubscriptions.set(owner, ownerSubscriptions)
        }

        if (ownerSubscriptions.get(rootTokenContract) != null) {
            return
        }

        class TokenWalletHandler implements ITokenWalletHandler {
            private readonly _owner: string
            private readonly _rootTokenContract: string
            private readonly _controller: AccountController

            constructor(owner: string, rootTokenContract: string, controller: AccountController) {
                this._owner = owner
                this._rootTokenContract = rootTokenContract
                this._controller = controller
            }

            onBalanceChanged(balance: string) {
                this._controller._updateTokenWalletState(
                    this._owner,
                    this._rootTokenContract,
                    balance
                )
            }

            onTransactionsFound(
                transactions: Array<nt.TokenWalletTransaction>,
                info: nt.TransactionsBatchInfo
            ) {
                this._controller._updateTokenTransactions(
                    this._owner,
                    this._rootTokenContract,
                    transactions,
                    info
                )
            }
        }

        console.debug('_createTokenWalletSubscription -> subscribing to token wallet')
        const subscription = await TokenWalletSubscription.subscribe(
            this.config.connectionController,
            owner,
            rootTokenContract,
            new TokenWalletHandler(owner, rootTokenContract, this)
        )
        console.debug('_createTokenWalletSubscription -> subscribed to token wallet')

        ownerSubscriptions.set(rootTokenContract, subscription)
        subscription.setPollingInterval(BACKGROUND_POLLING_INTERVAL)

        await subscription.start()

        const knownTokens = this.state.knownTokens
        this.update({
            knownTokens: {
                ...knownTokens,
                [rootTokenContract]: subscription.symbol,
            },
        })
    }

    private async _stopSubscriptions() {
        const stopTonSubscriptions = async () => {
            await Promise.all(
                Array.from(this._tonWalletSubscriptions.values()).map(
                    async (item) => await item.stop()
                )
            )
        }

        const stopTokenSubscriptions = async () => {
            await Promise.all(
                Array.from(this._tokenWalletSubscriptions.values()).map((subscriptions) =>
                    Promise.all(
                        Array.from(subscriptions.values()).map(async (item) => await item.stop())
                    )
                )
            )
        }

        await Promise.all([stopTonSubscriptions(), stopTokenSubscriptions()])

        this._tonWalletSubscriptions.clear()
        this._tokenWalletSubscriptions.clear()
        this._clearSendMessageRequests()

        this.update({
            accountContractStates: {},
            accountTokenStates: {},
            accountTransactions: {},
            accountTokenTransactions: {},
            accountPendingMessages: {},
        })
    }

    private _updateAssetsList(assetsList: nt.AssetsList) {
        const accountEntries = this.state.accountEntries
        let pubkeyEntries = accountEntries[assetsList.tonWallet.publicKey]
        if (pubkeyEntries == null) {
            pubkeyEntries = []
            accountEntries[assetsList.tonWallet.publicKey] = pubkeyEntries
        }

        const entryIndex = pubkeyEntries.findIndex(
            (item) => item.tonWallet.address == assetsList.tonWallet.address
        )
        if (entryIndex < 0) {
            pubkeyEntries.push(assetsList)
        } else {
            pubkeyEntries[entryIndex] = assetsList
        }

        const selectedAccount =
            this.state.selectedAccount?.tonWallet.address == assetsList.tonWallet.address
                ? assetsList
                : undefined

        this.update({
            selectedAccount,
            accountEntries,
        })
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

    private _updateTokenWalletState(owner: string, rootTokenContract: string, balance: string) {
        const accountTokenStates = this.state.accountTokenStates
        const ownerTokenStates = {
            ...accountTokenStates[owner],
            [rootTokenContract]: {
                balance,
            } as TokenWalletState,
        }
        const newBalances = {
            ...accountTokenStates,
            [owner]: ownerTokenStates,
        }
        this.update({
            accountTokenStates: newBalances,
        })
    }

    private _updateTransactions(
        address: string,
        transactions: nt.TonWalletTransaction[],
        info: nt.TransactionsBatchInfo
    ) {
        if (info.batchType == 'new') {
            for (const transaction of transactions) {
                const value = extractTransactionValue(transaction)
                const { address, direction } = extractTransactionAddress(transaction)

                const body = `${convertTons(value.toString())} TON ${direction} ${convertAddress(
                    address
                )}`

                this.config.notificationController.showNotification({
                    title: `New transaction found`,
                    body,
                    link: `https://ton-explorer.com/transactions/${transaction.id.hash}`,
                })
            }
        }

        const currentTransactions = this.state.accountTransactions
        const newTransactions = {
            ...currentTransactions,
            [address]: mergeTransactions(currentTransactions[address] || [], transactions, info),
        }
        this.update({
            accountTransactions: newTransactions,
        })
    }

    private _updateTokenTransactions(
        owner: string,
        rootTokenContract: string,
        transactions: nt.TokenWalletTransaction[],
        info: nt.TransactionsBatchInfo
    ) {
        if (info.batchType == 'new') {
            const symbol = this.state.knownTokens[rootTokenContract]
            if (symbol != null) {
                for (const transaction of transactions) {
                    const value = extractTokenTransactionValue(transaction)
                    if (value == null) {
                        continue
                    }

                    const direction = extractTokenTransactionAddress(transaction)

                    let body: string = `${convertCurrency(value.toString(), symbol.decimals)} ${
                        symbol.name
                    } ${value.lt(0) ? 'to' : 'from'} ${direction?.address}`

                    this.config.notificationController.showNotification({
                        title: `New token transaction found`,
                        body,
                        link: `https://ton-explorer.com/transactions/${transaction.id.hash}`,
                    })
                }
            }
        }

        const currentTransactions = this.state.accountTokenTransactions

        const ownerTransactions = currentTransactions[owner] || []
        const newOwnerTransactions = {
            ...ownerTransactions,
            [rootTokenContract]: mergeTransactions(
                ownerTransactions[rootTokenContract] || [],
                transactions,
                info
            ),
        }

        const newTransactions = {
            ...currentTransactions,
            [owner]: newOwnerTransactions,
        }

        this.update({
            accountTokenTransactions: newTransactions,
        })
    }
}

function requireTonWalletSubscription(
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

function requireTokenWalletSubscription(
    address: string,
    rootTokenContract: string,
    subscription?: TokenWalletSubscription
): asserts subscription is TokenWalletSubscription {
    if (!subscription) {
        throw new NekotonRpcError(
            RpcErrorCode.RESOURCE_UNAVAILABLE,
            `There is no token subscription for owner ${address}, root token contract ${rootTokenContract}`
        )
    }
}
