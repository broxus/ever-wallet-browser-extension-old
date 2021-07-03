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
    LedgerKeyToCreate,
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

import LedgerBridge from '../../ledger/LedgerBridge'

export interface AccountControllerConfig extends BaseConfig {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
    connectionController: ConnectionController
    notificationController: NotificationController
    ledgerBridge: LedgerBridge
}

export interface AccountControllerState extends BaseState {
    accountEntries: { [publicKey: string]: nt.AssetsList[] }
    accountContractStates: { [address: string]: nt.ContractState }
    accountTokenStates: { [address: string]: { [rootTokenContract: string]: TokenWalletState } }
    accountTransactions: { [address: string]: nt.TonWalletTransaction[] }
    accountTokenTransactions: {
        [address: string]: { [rootTokenContract: string]: nt.TokenWalletTransaction[] }
    }
    accountPendingMessages: { [address: string]: { [id: string]: SendMessageRequest } }
    accountsVisibility: { [address: string]: boolean }
    derivedKeysNames: { [publicKey: string]: string }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    masterKeysNames: { [masterKey: string]: string }
    resentMasterKeys: string[]
    selectedAccount: nt.AssetsList | undefined
    selectedMasterKey: string | undefined
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
}

const defaultState: AccountControllerState = {
    accountEntries: {},
    accountContractStates: {},
    accountTokenStates: {},
    accountTransactions: {},
    accountTokenTransactions: {},
    accountPendingMessages: {},
    accountsVisibility: {},
    derivedKeysNames: {},
    knownTokens: {},
    masterKeysNames: {},
    resentMasterKeys: [],
    selectedAccount: undefined,
    selectedMasterKey: undefined,
    storedKeys: {},
}

export class AccountController extends BaseController<
    AccountControllerConfig,
    AccountControllerState
> {
    private readonly _tonWalletSubscriptions: Map<string, TonWalletSubscription> = new Map()
    private readonly _tokenWalletSubscriptions: Map<string, Map<string, TokenWalletSubscription>> = new Map()
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

        const selectedAccountAddress = await this._loadSelectedAccountAddress()
        let selectedAccount: AccountControllerState['selectedAccount'] | undefined
        if (selectedAccountAddress != null) {
            selectedAccount = await this.config.accountsStorage.getAccount(selectedAccountAddress)
        }
        if (selectedAccount == null) {
            selectedAccount = entries[0]
        }

        let selectedMasterKey = await this._loadSelectedMasterKey()
        if (selectedMasterKey == null && selectedAccount !== undefined) {
            selectedMasterKey = storedKeys[selectedAccount.tonWallet.publicKey].masterKey
        }

        let accountsVisibility = await this._loadAccountsVisibility()
        if (accountsVisibility == null) {
            accountsVisibility = {}
        }

        let derivedKeysNames = await this._loadDerivedKeysNames()
        if (derivedKeysNames == null) {
            derivedKeysNames = {}
        }

        let masterKeysNames = await this._loadMasterKeysNames()
        if (masterKeysNames == null) {
            masterKeysNames = {}
        }

        this.update({
            accountsVisibility,
            selectedAccount,
            accountEntries,
            derivedKeysNames,
            masterKeysNames,
            selectedMasterKey,
            storedKeys,
        })
    }

    public async startSubscriptions() {
        console.debug('startSubscriptions')

        const selectedConnection = this.config.connectionController.state.selectedConnection

        await this._accountsMutex.use(async () => {
            console.debug('startSubscriptions -> mutex gained')

            const accountEntries = this.state.accountEntries
            const iterateEntries = async (f: (entry: nt.AssetsList) => void) =>
                Promise.all(
                    window.ObjectExt.values(accountEntries).map((entries) =>
                        Promise.all(entries.map(f))
                    )
                )

            await iterateEntries(async ({ tonWallet, additionalAssets }) => {
                await this._createTonWalletSubscription(
                    tonWallet.address,
                    tonWallet.publicKey,
                    tonWallet.contractType
                )

                const assets = additionalAssets[selectedConnection.group] as
                    | nt.AdditionalAssets
                    | undefined

                if (assets != null) {
                    await Promise.all(
                        assets.tokenWallets.map(async ({ rootTokenContract }) => {
                            await this._createTokenWalletSubscription(
                                tonWallet.address,
                                rootTokenContract
                            )
                        })
                    )
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
            await this._removeSelectedAccountAddress()
            this.update(_.cloneDeep(defaultState), true)

            console.debug('logOut -> mutex released')
        })
    }

    public async createMasterKey({ name, password, seed }: MasterKeyToCreate): Promise<nt.KeyStoreEntry> {
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

            if (name !== undefined) {
                await this.updateMasterKeyName(entry.masterKey, name)
            }

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

    public async selectMasterKey(masterKey: string) {

        this.update({
            selectedMasterKey: masterKey,
        })

        await this._saveSelectedMasterKey()
    }

    public async exportMasterKey(exportKey: nt.ExportKey): Promise<nt.ExportedKey> {
        return this.config.keyStore.exportKey(exportKey)
    }

    public async updateMasterKeyName(masterKey: string, name: string): Promise<void> {
        await this._saveMasterKeyName(masterKey, name)

        this.update({
            masterKeysNames: {
                ...this.state.masterKeysNames,
                [masterKey]: name,
            },
        })
    }

    public async createDerivedKey({
        accountId,
        masterKey,
        name,
        password,
    }: KeyToDerive): Promise<nt.KeyStoreEntry> {
        const { keyStore } = this.config

        try {
            const entry = await keyStore.addKey({
                type: 'master_key',
                data: {
                    password,
                    params: { masterKey, accountId },
                },
            })

            if (name !== undefined) {
                await this.updateDerivedKeyName(entry.publicKey, name)
            }

            this.update({
                derivedKeysNames:
                    typeof name === 'string'
                        ? {
                              ...this.state.derivedKeysNames,
                              [entry.publicKey]: name,
                          }
                        : { ...this.state.derivedKeysNames },
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

    public async updateDerivedKeyName(publicKey: string, name: string): Promise<void> {
        await this._saveDerivedKeyName(publicKey, name)

        this.update({
            derivedKeysNames: {
                ...this.state.derivedKeysNames,
                [publicKey]: name,
            },
        })
    }

    public async createLedgerKey({ accountId }: LedgerKeyToCreate): Promise<nt.KeyStoreEntry> {
        const { keyStore } = this.config

        try {
            const entry = await keyStore.addKey({
                type: 'ledger_key',
                data: {
                    accountId,
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

    public async getLedgerFirstPage() {
        const { ledgerBridge } = this.config
        return await ledgerBridge.getFirstPage()
    }

    public async getLedgerNextPage() {
        const { ledgerBridge } = this.config
        return await ledgerBridge.getNextPage()
    }

    public async getLedgerPreviousPage() {
        const { ledgerBridge } = this.config
        return await ledgerBridge.getPreviousPage()
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

            const selectedAccount = await accountsStorage.addAccount(name, publicKey, contractType)

            const accountEntries = this.state.accountEntries
            let entries = accountEntries[publicKey]
            if (entries == null) {
                entries = []
                accountEntries[publicKey] = entries
            }
            entries.push(selectedAccount)

            await this.updateAccountVisibility(selectedAccount.tonWallet.address, true)

            this.update({
                selectedAccount,
                accountEntries,
            })

            await this._saveSelectedAccountAddress()

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

            let selectedAccount: nt.AssetsList | undefined = undefined
            for (const entries of Object.values(this.state.accountEntries)) {
                selectedAccount = entries.find((item) => item.tonWallet.address == address)
                if (selectedAccount != null) {
                    break
                }
            }

            if (selectedAccount != null) {
                this.update({
                    selectedAccount,
                })

                await this._saveSelectedAccountAddress()
            }

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

    public updateAccountName(account: nt.AssetsList, name: string) {
        const accountEntries = { ...this.state.accountEntries }
        let pubkeyEntries = accountEntries[account.tonWallet.publicKey]
        if (pubkeyEntries == null) {
            pubkeyEntries = []
            accountEntries[account.tonWallet.publicKey] = pubkeyEntries
        }

        const entryIndex = pubkeyEntries.findIndex(
            (item) => item.tonWallet.address == account.tonWallet.address
        )
        if (entryIndex < 0) {
            pubkeyEntries.push({ ...account, name })
        }
        else {
            pubkeyEntries[entryIndex] = { ...account, name }
        }

        this.update({
            accountEntries,
        })
    }

    public async updateAccountVisibility(address: string, visible: boolean): Promise<void> {
        await this._saveAccountVisibility(address, visible)

        this.update({
            accountsVisibility: {
                ...this.state.accountsVisibility,
                [address]: visible,
            },
        })
    }

    public async updateTokenWallets(address: string, params: TokenWalletsToUpdate): Promise<void> {
        const { accountsStorage, connectionController } = this.config

        const networkGroup = connectionController.state.selectedConnection.group

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
                                await accountsStorage.addTokenWallet(
                                    address,
                                    networkGroup,
                                    rootTokenContract
                                )
                            } else {
                                const tokenSubscriptions = this._tokenWalletSubscriptions.get(
                                    address
                                )
                                const subscription = tokenSubscriptions?.get(rootTokenContract)
                                if (subscription != null) {
                                    tokenSubscriptions?.delete(rootTokenContract)
                                    await subscription.stop()
                                }
                                await accountsStorage.removeTokenWallet(
                                    address,
                                    networkGroup,
                                    rootTokenContract
                                )
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
        if (password.type == 'ledger_key') {
            return Promise.resolve(true)
        }

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
                wallet.publicKey,
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

    public async getCustodians(address: string) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireTonWalletSubscription(address, subscription)

        return subscription.use(async (wallet) => {
            try {
                return await wallet.getCustodians()
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
            }
        })
    }

    public async getMultisigPendingTransactions(address: string) {
        const subscription = await this._tonWalletSubscriptions.get(address)
        requireTonWalletSubscription(address, subscription)

        return subscription.use(async (wallet) => {
            try {
                return await wallet.getMultisigPendingTransactions()
            } catch (e) {
                throw new NekotonRpcError(RpcErrorCode.INTERNAL, e.toString())
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
                wallet.publicKey,
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

    public async preloadTokenTransactions(
        owner: string,
        rootTokenContract: string,
        lt: string,
        hash: string
    ) {
        const subscription = this._tokenWalletSubscriptions.get(owner)?.get(rootTokenContract)
        if (!subscription) {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                `There is no token wallet subscription for address ${owner} for root ${rootTokenContract}`
            )
        }

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
        const { accountEntries } = this.state
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

    private async _loadSelectedAccountAddress(): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve) => {
            chrome.storage.local.get(['selectedAccountAddress'], ({ selectedAccountAddress }) => {
                if (typeof selectedAccountAddress !== 'string') {
                    return resolve(undefined)
                }
                resolve(selectedAccountAddress)
            })
        })
    }

    private async _saveSelectedAccountAddress(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.storage.local.set(
                { selectedAccountAddress: this.state.selectedAccount?.tonWallet.address },
                () => resolve()
            )
        })
    }

    private async _loadSelectedMasterKey(): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve) => {
            chrome.storage.local.get(['selectedSeed'], ({ selectedSeed }) => {
                if (typeof selectedSeed !== 'object') {
                    return resolve(undefined)
                }
                resolve(selectedSeed)
            })
        })
    }

    private async _saveSelectedMasterKey(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.storage.local.set(
                { selectedMasterKey: this.state.selectedMasterKey },
                () => resolve()
            )
        })
    }

    private async _removeSelectedAccountAddress(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.storage.local.remove('selectedAccountAddress', () => resolve())
        })
    }

    private async _loadMasterKeysNames(): Promise<{ [masterKey: string]: string } | undefined> {
        return new Promise<{ [masterKey: string]: string } | undefined>((resolve) => {
            chrome.storage.local.get(['masterKeysNames'], ({ masterKeysNames }) => {
                if (typeof masterKeysNames !== 'object') {
                    return resolve(undefined)
                }
                resolve(masterKeysNames)
            })
        })
    }

    private async _saveMasterKeyName(masterKey: string, name: string): Promise<void> {
        let masterKeysNames = await this._loadMasterKeysNames()
        if (!masterKeysNames || typeof masterKeysNames !== 'object') {
            masterKeysNames = {}
        }
        masterKeysNames[masterKey] = name

        return new Promise<void>((resolve) => {
            chrome.storage.local.set({ masterKeysNames }, () => resolve())
        })
    }

    private async _loadDerivedKeysNames(): Promise<{ [publicKey: string]: string } | undefined> {
        return new Promise<{ [publicKey: string]: string } | undefined>((resolve) => {
            chrome.storage.local.get(['derivedKeysNames'], ({ derivedKeysNames }) => {
                if (typeof derivedKeysNames !== 'object') {
                    return resolve(undefined)
                }
                resolve(derivedKeysNames)
            })
        })
    }

    private async _saveDerivedKeyName(publicKey: string, name: string): Promise<void> {
        let derivedKeysNames = await this._loadDerivedKeysNames()
        if (!derivedKeysNames || typeof derivedKeysNames !== 'object') {
            derivedKeysNames = {}
        }
        derivedKeysNames[publicKey] = name

        return new Promise<void>((resolve) => {
            chrome.storage.local.set({ derivedKeysNames }, () => resolve())
        })
    }

    private async _loadAccountsVisibility(): Promise<{ [address: string]: boolean } | undefined> {
        return new Promise<{ [address: string]: boolean } | undefined>((resolve) => {
            chrome.storage.local.get(['accountsVisibility'], ({ accountsVisibility }) => {
                if (typeof accountsVisibility !== 'object') {
                    return resolve(undefined)
                }
                resolve(accountsVisibility)
            })
        })
    }

    private async _saveAccountVisibility(address: string, visible: boolean): Promise<void> {
        let accountsVisibility = await this._loadAccountsVisibility()
        if (!accountsVisibility || typeof accountsVisibility !== 'object') {
            accountsVisibility = {}
        }
        accountsVisibility[address] = visible

        return new Promise<void>((resolve) => {
            chrome.storage.local.set({ accountsVisibility }, () => resolve())
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
