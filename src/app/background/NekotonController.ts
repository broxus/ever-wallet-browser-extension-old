import { EventEmitter } from 'events'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'
import { nanoid } from 'nanoid'
import { debounce } from 'lodash'
import { ProviderEvent, RawProviderEventData } from 'ton-inpage-provider'
import * as nt from '@nekoton'

import {
    DestroyableMiddleware,
    JsonRpcEngine,
    JsonRpcFailure,
    JsonRpcMiddleware,
    JsonRpcRequest,
    JsonRpcSuccess,
} from '@shared/jrpc'
import {
    createEngineStream,
    NekotonRpcError,
    nodeify,
    nodeifyAsync,
    serializeError,
} from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'
import { NEKOTON_PROVIDER } from '@shared/constants'
import { ConnectionDataItem, ExternalWindowParams, WindowInfo } from '@shared/backgroundApi'

import { AccountController } from './controllers/AccountController'
import { ApprovalController } from './controllers/ApprovalController'
import { ConnectionController } from './controllers/ConnectionController'
import { NotificationController } from './controllers/NotificationController'
import { PermissionsController } from './controllers/PermissionsController'
import { SubscriptionController } from './controllers/SubscriptionController'
import { createProviderMiddleware } from './providerMiddleware'
import { focusTab, focusWindow, WindowManager, openExtensionInBrowser } from '@popup/utils/platform'

import LedgerBridge from './ledger/LedgerBridge'

export interface TriggerUiParams {
    group: string
    force: boolean
    width?: number
    height?: number
}

export interface NekotonControllerOptions {
    windowManager: WindowManager
    openExternalWindow: (params: TriggerUiParams) => void
    getOpenNekotonTabIds: () => { [id: number]: true }
}

interface NekotonControllerComponents {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
    windowManager: WindowManager
    accountController: AccountController
    approvalController: ApprovalController
    connectionController: ConnectionController
    notificationController: NotificationController
    permissionsController: PermissionsController
    subscriptionsController: SubscriptionController
}

interface SetupProviderEngineOptions {
    origin: string
    location?: string
    extensionId?: string
    tabId?: number
    isInternal: boolean
}

export class NekotonController extends EventEmitter {
    private _activeControllerConnections: number = 0
    private readonly _connections: { [id: string]: { engine: JsonRpcEngine } } = {}
    private readonly _originToConnectionIds: { [origin: string]: Set<string> } = {}
    private readonly _originToTabIds: { [origin: string]: Set<number> } = {}
    private readonly _tabToConnectionIds: { [tabId: number]: Set<string> } = {}
    private readonly _tempStorage: { [key: string]: any } = {}

    private readonly _options: NekotonControllerOptions
    private readonly _components: NekotonControllerComponents

    private _updateDebounce: {
        timer: number | undefined
        shouldRepeat: boolean
    } = {
        timer: undefined,
        shouldRepeat: false,
    }

    public static async load(options: NekotonControllerOptions) {
        const storage = new nt.Storage(new StorageConnector())
        const accountsStorage = await nt.AccountsStorage.load(storage)

        const ledgerBridge = new LedgerBridge()
        const ledgerConnection = new nt.LedgerConnection(new LedgerConnection(ledgerBridge))

        const keyStore = await nt.KeyStore.load(storage, ledgerConnection)

        const connectionController = new ConnectionController({})

        const notificationController = new NotificationController({
            disabled: true,
        })

        const accountController = new AccountController({
            storage,
            accountsStorage,
            keyStore,
            connectionController,
            notificationController,
            ledgerBridge,
        })
        const approvalController = new ApprovalController({
            showApprovalRequest: () =>
                options.openExternalWindow({
                    group: 'approval',
                    force: false,
                }),
        })
        const permissionsController = new PermissionsController({
            approvalController,
        })
        const subscriptionsController = new SubscriptionController({
            connectionController,
        })

        await connectionController.initialSync()
        await accountController.initialSync()
        await accountController.startSubscriptions()
        await permissionsController.initialSync()

        notificationController.setHidden(false)

        return new NekotonController(options, {
            storage,
            accountsStorage,
            keyStore,
            windowManager: options.windowManager,
            accountController,
            approvalController,
            connectionController,
            notificationController,
            permissionsController,
            subscriptionsController,
        })
    }

    private constructor(
        options: NekotonControllerOptions,
        components: NekotonControllerComponents
    ) {
        super()

        this._options = options
        this._components = components

        this._components.approvalController.subscribe((_state) => {
            this._debouncedSendUpdate()
        })

        this._components.accountController.subscribe((_state) => {
            this._debouncedSendUpdate()
        })

        this._components.connectionController.subscribe((_state) => {
            this._debouncedSendUpdate()
        })

        this._components.permissionsController.config.notifyDomain = this._notifyConnections.bind(
            this
        )
        this._components.subscriptionsController.config.notifyTab = this._notifyTab.bind(this)
        this._components.subscriptionsController.config.getOriginTabs = this._getOriginTabs.bind(
            this
        )

        this.on('controllerConnectionChanged', (activeControllerConnections: number) => {
            if (activeControllerConnections > 0) {
                this._components.accountController.enableIntensivePolling()
                this._components.notificationController.setHidden(true)
            } else {
                this._components.accountController.disableIntensivePolling()
                this._components.approvalController.clear()
                this._components.notificationController.setHidden(false)
            }
        })
    }

    public setupTrustedCommunication<T extends Duplex>(
        connectionStream: T,
        sender: chrome.runtime.MessageSender
    ) {
        const mux = setupMultiplex(connectionStream)
        this._setupControllerConnection(mux.createStream('controller'))
        this._setupProviderConnection(mux.createStream('provider'), sender, true)
    }

    public setupUntrustedCommunication<T extends Duplex>(
        connectionStream: T,
        sender: chrome.runtime.MessageSender
    ) {
        const mux = setupMultiplex(connectionStream)
        this._setupProviderConnection(mux.createStream(NEKOTON_PROVIDER), sender, false)
    }

    public getApi() {
        type ApiCallback<T> = (error: Error | null, result?: T) => void

        const {
            windowManager,
            approvalController,
            accountController,
            connectionController,
        } = this._components

        return {
            initialize: (windowId: number | undefined, cb: ApiCallback<WindowInfo>) => {
                const group = windowId != null ? windowManager.getGroup(windowId) : undefined
                cb(null, {
                    group,
                })
            },
            getState: (cb: ApiCallback<ReturnType<typeof NekotonController.prototype.getState>>) =>
                cb(null, this.getState()),
            getAvailableNetworks: (cb: ApiCallback<ConnectionDataItem[]>) =>
                cb(null, connectionController.getAvailableNetworks()),
            openExtensionInBrowser: (
                params: { route?: string; query?: string },
                cb: ApiCallback<undefined>
            ) => {
                const existingTabs = window.ObjectExt.keys(this._options.getOpenNekotonTabIds())
                if (existingTabs.length == 0) {
                    openExtensionInBrowser(params.route, params.query).then(() => cb(null))
                } else {
                    focusTab(existingTabs[0]).then(async (tab) => {
                        tab && (await focusWindow(tab.windowId))
                        cb(null)
                    })
                }
            },
            tempStorageGet: (key: string, cb: ApiCallback<any | undefined>) => {
                cb(null, this._tempStorage[key])
            },
            tempStorageInsert: (key: string, value: any, cb: ApiCallback<any | undefined>) => {
                let oldValue = this._tempStorage[key]
                this._tempStorage[key] = value
                cb(null, oldValue)
            },
            tempStorageRemove: (key: string, cb: ApiCallback<any | undefined>) => {
                let oldValue = this._tempStorage[key]
                delete this._tempStorage[key]
                cb(null, oldValue)
            },
            openExtensionInExternalWindow: (
                { group, width, height }: ExternalWindowParams,
                cb: ApiCallback<undefined>
            ) => {
                this._options.openExternalWindow({
                    group,
                    width,
                    height,
                    force: true,
                })
                cb(null)
            },
            changeNetwork: nodeifyAsync(this, 'changeNetwork'),
            checkPassword: nodeifyAsync(accountController, 'checkPassword'),
            createMasterKey: nodeifyAsync(accountController, 'createMasterKey'),
            selectMasterKey: nodeifyAsync(accountController, 'selectMasterKey'),
            exportMasterKey: nodeifyAsync(accountController, 'exportMasterKey'),
            updateMasterKeyName: nodeifyAsync(accountController, 'updateMasterKeyName'),
            updateRecentMasterKey: nodeifyAsync(accountController, 'updateRecentMasterKey'),
            getPublicKeys: nodeifyAsync(accountController, 'getPublicKeys'),
            createDerivedKey: nodeifyAsync(accountController, 'createDerivedKey'),
            createDerivedKeys: nodeifyAsync(accountController, 'createDerivedKeys'),
            createLedgerKey: nodeifyAsync(accountController, 'createLedgerKey'),
            removeKey: nodeifyAsync(accountController, 'removeKey'),
            removeKeys: nodeifyAsync(accountController, 'removeKeys'),
            getLedgerFirstPage: nodeifyAsync(accountController, 'getLedgerFirstPage'),
            getLedgerNextPage: nodeifyAsync(accountController, 'getLedgerNextPage'),
            getLedgerPreviousPage: nodeifyAsync(accountController, 'getLedgerPreviousPage'),
            createAccount: nodeifyAsync(accountController, 'createAccount'),
            addExternalAccount: nodeifyAsync(accountController, 'addExternalAccount'),
            selectAccount: nodeifyAsync(accountController, 'selectAccount'),
            removeAccount: nodeifyAsync(accountController, 'removeAccount'),
            removeAccounts: nodeifyAsync(accountController, 'removeAccounts'),
            renameAccount: nodeifyAsync(accountController, 'renameAccount'),
            updateAccountVisibility: nodeifyAsync(accountController, 'updateAccountVisibility'),
            updateDerivedKeyName: nodeifyAsync(accountController, 'updateDerivedKeyName'),
            getMultisigPendingTransactions: nodeifyAsync(
                accountController,
                'getMultisigPendingTransactions'
            ),
            getTonWalletInitData: nodeifyAsync(accountController, 'getTonWalletInitData'),
            getTokenRootDetailsFromTokenWallet: nodeifyAsync(
                accountController,
                'getTokenRootDetailsFromTokenWallet'
            ),
            getTokenWalletBalance: nodeifyAsync(accountController, 'getTokenWalletBalance'),
            updateTokenWallets: nodeifyAsync(accountController, 'updateTokenWallets'),
            logOut: nodeifyAsync(this, 'logOut'),
            estimateFees: nodeifyAsync(accountController, 'estimateFees'),
            estimateConfirmationFees: nodeifyAsync(accountController, 'estimateConfirmationFees'),
            estimateDeploymentFees: nodeifyAsync(accountController, 'estimateDeploymentFees'),
            prepareTransferMessage: nodeifyAsync(accountController, 'prepareTransferMessage'),
            prepareConfirmMessage: nodeifyAsync(accountController, 'prepareConfirmMessage'),
            prepareDeploymentMessage: nodeifyAsync(accountController, 'prepareDeploymentMessage'),
            prepareTokenMessage: nodeifyAsync(accountController, 'prepareTokenMessage'),
            prepareSwapBackMessage: nodeifyAsync(accountController, 'prepareSwapBackMessage'),
            sendMessage: nodeifyAsync(accountController, 'sendMessage'),
            preloadTransactions: nodeifyAsync(accountController, 'preloadTransactions'),
            preloadTokenTransactions: nodeifyAsync(accountController, 'preloadTokenTransactions'),
            resolvePendingApproval: nodeify(approvalController, 'resolve'),
            rejectPendingApproval: nodeify(approvalController, 'reject'),
        }
    }

    public getState() {
        return {
            ...this._components.approvalController.state,
            ...this._components.accountController.state,
            ...this._components.connectionController.state,
        }
    }

    public async changeNetwork(params: ConnectionDataItem) {
        const currentNetwork = this._components.connectionController.state.selectedConnection
        if (currentNetwork.id == params.id) {
            return
        }

        await this._components.accountController.stopSubscriptions()
        console.debug('Stopped account subscriptions')

        await this._components.subscriptionsController.stopSubscriptions()
        console.debug('Stopped contract subscriptions')

        try {
            await this._components.connectionController.trySwitchingNetwork(params, true)
        } catch (e) {
            await this._components.connectionController.trySwitchingNetwork(currentNetwork, true)
        } finally {
            await this._components.accountController.startSubscriptions()

            this._notifyAllConnections({
                method: 'networkChanged',
                params: {
                    selectedConnection: this._components.connectionController.state
                        .selectedConnection.group,
                },
            })

            this._sendUpdate()
        }
    }

    public async logOut() {
        await this._components.accountController.logOut()
        await this._components.subscriptionsController.stopSubscriptions()
        await this._components.approvalController.clear()
        await this._components.permissionsController.clear()

        this._notifyAllConnections({
            method: 'loggedOut',
            params: {},
        })
    }

    private _setupControllerConnection<T extends Duplex>(outStream: T) {
        const api = this.getApi()

        this._activeControllerConnections += 1
        this.emit('controllerConnectionChanged', this._activeControllerConnections)

        outStream.on('data', createMetaRPCHandler(api, outStream))

        const handleUpdate = (params: unknown) => {
            try {
                outStream.write({
                    jsonrpc: '2.0',
                    method: 'sendUpdate',
                    params,
                })
            } catch (e) {
                console.error(e)
            }
        }

        this.on('update', handleUpdate)

        outStream.on('end', () => {
            this._activeControllerConnections -= 1
            this.emit('controllerConnectionChanged', this._activeControllerConnections)
            this.removeListener('update', handleUpdate)
        })
    }

    private _setupProviderConnection<T extends Duplex>(
        outStream: T,
        sender: chrome.runtime.MessageSender,
        isInternal: boolean
    ) {
        const origin = isInternal ? 'nekoton' : new URL(sender.url || 'unknown').origin
        let extensionId
        if (sender.id !== chrome.runtime.id) {
            extensionId = sender.id
        }
        let tabId: number | undefined
        if (sender.tab && sender.tab.id) {
            tabId = sender.tab.id
        }

        const engine = this._setupProviderEngine({
            origin,
            location: sender.url,
            extensionId,
            tabId,
            isInternal,
        })

        const providerStream = createEngineStream({ engine })

        const connectionId = this._addConnection(origin, tabId, { engine })

        pump(outStream, providerStream, outStream, (e) => {
            console.debug('providerStream closed')

            engine.middleware.forEach((middleware) => {
                if (
                    ((middleware as unknown) as DestroyableMiddleware).destroy &&
                    typeof ((middleware as unknown) as DestroyableMiddleware).destroy === 'function'
                ) {
                    ;((middleware as unknown) as DestroyableMiddleware).destroy()
                }
            })

            if (tabId) {
                this._components.subscriptionsController
                    .unsubscribeFromAllContracts(tabId)
                    .catch(console.error)
            }

            connectionId && this._removeConnection(origin, tabId, connectionId)
            if (e) {
                console.error(e)
            }
        })
    }

    private _setupProviderEngine({ origin, tabId, isInternal }: SetupProviderEngineOptions) {
        const engine = new JsonRpcEngine()

        engine.push(createOriginMiddleware({ origin }))
        if (tabId) {
            engine.push(createTabIdMiddleware({ tabId }))
        }

        engine.push(
            createProviderMiddleware({
                origin,
                tabId,
                isInternal,
                approvalController: this._components.approvalController,
                accountController: this._components.accountController,
                connectionController: this._components.connectionController,
                permissionsController: this._components.permissionsController,
                subscriptionsController: this._components.subscriptionsController,
            })
        )

        return engine
    }

    private _addConnection(
        origin: string,
        tabId: number | undefined,
        { engine }: AddConnectionOptions
    ) {
        if (origin === 'nekoton') {
            return null
        }

        const id = nanoid()
        this._connections[id] = {
            engine,
        }

        let originIds = this._originToConnectionIds[origin]
        if (originIds == null) {
            originIds = new Set()
            this._originToConnectionIds[origin] = originIds
        }
        originIds.add(id)

        if (tabId != null) {
            let tabIds = this._tabToConnectionIds[tabId]
            if (tabIds == null) {
                tabIds = new Set()
                this._tabToConnectionIds[tabId] = tabIds
            }
            tabIds.add(id)

            let originTabs = this._originToTabIds[origin]
            if (originTabs == null) {
                originTabs = new Set()
                this._originToTabIds[origin] = originTabs
            }
            originTabs.add(tabId)
        }

        return id
    }

    private _removeConnection(origin: string, tabId: number | undefined, id: string) {
        delete this._connections[id]

        const originIds = this._originToConnectionIds[origin]
        if (originIds != null) {
            originIds.delete(id)
            if (originIds.size === 0) {
                delete this._originToConnectionIds[origin]
            }
        }

        if (tabId != null) {
            const tabIds = this._tabToConnectionIds[tabId]
            if (tabIds != null) {
                tabIds.delete(id)
                if (tabIds.size === 0) {
                    delete this._tabToConnectionIds[tabId]
                }
            }

            let originTabs = this._originToTabIds[origin]
            if (originTabs != null) {
                originTabs.delete(tabId)
                if (originTabs.size === 0) {
                    delete this._originToTabIds[origin]
                }
            }
        }
    }

    private _notifyConnection<T extends ProviderEvent>(
        id: string,
        payload: RawProviderEventData<T>
    ) {
        this._connections[id]?.engine.emit('notification', payload)
    }

    private _getOriginTabs(origin: string) {
        const tabIds = this._originToTabIds[origin]
        return tabIds ? Array.from(tabIds.values()) : []
    }

    private _notifyTab<T extends ProviderEvent>(tabId: number, payload: RawProviderEventData<T>) {
        const tabIds = this._tabToConnectionIds[tabId]
        if (tabIds) {
            tabIds.forEach((id) => {
                this._connections[id]?.engine.emit('notification', payload)
            })
        }
    }

    private _notifyConnections<T extends ProviderEvent>(
        origin: string,
        payload: RawProviderEventData<T>
    ) {
        const originIds = this._originToConnectionIds[origin]
        if (originIds) {
            originIds.forEach((id) => {
                this._connections[id]?.engine.emit('notification', payload)
            })
        }
    }

    private _notifyAllConnections<T extends ProviderEvent>(payload: RawProviderEventData<T>) {
        Object.values(this._connections).forEach(({ engine }) => {
            engine.emit('notification', payload)
        })
    }

    private _debouncedSendUpdate() {
        if (this._updateDebounce.timer == null) {
            this._sendUpdate()

            this._updateDebounce.shouldRepeat = false

            this._updateDebounce.timer = window.setTimeout(() => {
                this._updateDebounce.timer = undefined

                if (this._updateDebounce.shouldRepeat) {
                    this._debouncedSendUpdate()
                }
            }, 200)
        } else {
            this._updateDebounce.shouldRepeat = true
        }
    }

    private _sendUpdate() {
        this.emit('update', this.getState())
    }
}

export class StorageConnector {
    get(key: string, handler: nt.StorageQueryResultHandler) {
        chrome.storage.local.get(key, (items) => {
            handler.onResult(items[key])
        })
    }

    set(key: string, value: string, handler: nt.StorageQueryHandler) {
        chrome.storage.local.set({ [key]: value }, () => {
            handler.onResult()
        })
    }

    setUnchecked(key: string, value: string) {
        chrome.storage.local.set({ [key]: value }, () => {})
    }

    remove(key: string, handler: nt.StorageQueryHandler) {
        chrome.storage.local.remove([key], () => {
            handler.onResult()
        })
    }

    removeUnchecked(key: string) {
        chrome.storage.local.remove([key], () => {})
    }
}

export class LedgerConnection {
    constructor(private readonly bridge: LedgerBridge) {}

    async getPublicKey(account: number, handler: nt.LedgerQueryResultHandler) {
        await this.bridge
            .getPublicKey(account)
            .then((publicKey) => {
                handler.onResult(publicKey)
            })
            .catch((err) => {
                handler.onError(err.message)
            })
    }

    async sign(account: number, message: Buffer, handler: nt.LedgerQueryResultHandler) {
        await this.bridge
            .signHash(account, new Uint8Array(message))
            .then((signature) => {
                handler.onResult(signature)
            })
            .catch((err) => {
                handler.onError(err.message)
            })
    }
}

interface AddConnectionOptions {
    engine: JsonRpcEngine
}

interface CreateOriginMiddlewareOptions {
    origin: string
}

const createOriginMiddleware = ({
    origin,
}: CreateOriginMiddlewareOptions): JsonRpcMiddleware<unknown, unknown> => {
    return (req, _res, next, _end) => {
        ;(req as any).origin = origin
        next()
    }
}

interface CreateTabIdMiddlewareOptions {
    tabId: number
}

const createTabIdMiddleware = ({
    tabId,
}: CreateTabIdMiddlewareOptions): JsonRpcMiddleware<unknown, unknown> => {
    return (req, _res, next, _end) => {
        ;(req as any).tabId = tabId
        next()
    }
}

interface CreateLoggerMiddlewareOptions {
    origin: string
}

const setupMultiplex = <T extends Duplex>(connectionStream: T) => {
    const mux = new ObjectMultiplex()
    pump(connectionStream, mux, connectionStream, (e) => {
        if (e) {
            console.error(e)
        }
    })
    return mux
}

const createMetaRPCHandler = <T extends Duplex>(
    api: ReturnType<typeof NekotonController.prototype.getApi>,
    outStream: T
) => {
    return (data: JsonRpcRequest<unknown[]>) => {
        type MethodName = keyof typeof api

        if (api[data.method as MethodName] == null) {
            outStream.write(<JsonRpcFailure>{
                jsonrpc: '2.0',
                error: serializeError(
                    new NekotonRpcError(RpcErrorCode.METHOD_NOT_FOUND, `${data.method} not found`)
                ),
                id: data.id,
            })
            return
        }

        ;(api[data.method as MethodName] as any)(
            ...(data.params || []),
            <T>(error: Error | undefined, result: T) => {
                if (error) {
                    outStream.write(<JsonRpcFailure>{
                        jsonrpc: '2.0',
                        error: serializeError(error, { shouldIncludeStack: true }),
                        id: data.id,
                    })
                } else {
                    outStream.write(<JsonRpcSuccess<T>>{
                        jsonrpc: '2.0',
                        result,
                        id: data.id,
                    })
                }
            }
        )
    }
}
