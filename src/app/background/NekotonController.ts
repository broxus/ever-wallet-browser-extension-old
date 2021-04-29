import { EventEmitter } from 'events'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'
import { nanoid } from 'nanoid'
import { debounce } from 'lodash'
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
import { NamedConnectionData } from '@shared/approvalApi'

import { AccountController } from './controllers/AccountController'
import { ApprovalController } from './controllers/ApprovalController'
import { ConnectionController } from './controllers/ConnectionController'
import { NotificationController } from './controllers/NotificationController'
import { PermissionsController } from './controllers/PermissionsController'
import { createProviderMiddleware } from './providerMiddleware'

interface NekotonControllerOptions {
    showUserConfirmation: () => void
    openPopup: () => void
    getRequestAccountTabIds: () => { [origin: string]: number }
    getOpenNekotonTabIds: () => { [id: number]: true }
}

interface NekotonControllerComponents {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
    accountController: AccountController
    approvalController: ApprovalController
    connectionController: ConnectionController
    notificationController: NotificationController
    permissionsController: PermissionsController
}

interface SetupProviderEngineOptions {
    origin: string
    location?: string
    extensionId?: string
    tabId?: number
    isInternal: boolean
}

export class NekotonController extends EventEmitter {
    private _defaultMaxListeners: number
    private _activeControllerConnections: number
    private readonly _connections: { [origin: string]: { [id: string]: { engine: JsonRpcEngine } } }

    private readonly _options: NekotonControllerOptions
    private readonly _components: NekotonControllerComponents

    public static async load(options: NekotonControllerOptions) {
        const storage = new nt.Storage(new StorageConnector())
        const accountsStorage = await nt.AccountsStorage.load(storage)
        const keyStore = await nt.KeyStore.load(storage)

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
        })
        const approvalController = new ApprovalController({
            showApprovalRequest: options.showUserConfirmation,
        })
        const permissionsController = new PermissionsController({
            approvalController,
        })

        await connectionController.initialSync()
        await accountController.startSubscriptions()

        notificationController.setHidden(false)

        return new NekotonController(options, {
            storage,
            accountsStorage,
            keyStore,
            accountController,
            approvalController,
            connectionController,
            notificationController,
            permissionsController,
        })
    }

    private constructor(
        options: NekotonControllerOptions,
        components: NekotonControllerComponents
    ) {
        super()

        this._defaultMaxListeners = 20
        this._activeControllerConnections = 0

        this._connections = {}

        this._options = options
        this._components = components

        this._components.approvalController.subscribe((_state) => {
            this._debouncedSendUpdate()
        })

        this._components.accountController.subscribe((_state) => {
            this._debouncedSendUpdate()
        })

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

        const { approvalController, accountController, connectionController } = this._components

        return {
            getState: (cb: ApiCallback<ReturnType<typeof NekotonController.prototype.getState>>) =>
                cb(null, this.getState()),
            getAvailableNetworks: (cb: ApiCallback<NamedConnectionData[]>) =>
                cb(null, connectionController.getAvailableNetworks()),
            changeNetwork: nodeifyAsync(this, 'changeNetwork'),
            checkPassword: nodeifyAsync(accountController, 'checkPassword'),
            createAccount: nodeifyAsync(accountController, 'createAccount'),
            logOut: nodeifyAsync(this, 'logOut'),
            estimateFees: nodeifyAsync(accountController, 'estimateFees'),
            prepareMessage: nodeifyAsync(accountController, 'prepareMessage'),
            sendMessage: nodeifyAsync(accountController, 'sendMessage'),
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

    public async changeNetwork(params: NamedConnectionData) {
        await this._components.accountController.stopSubscriptions()
        await this._components.connectionController
            .startSwitchingNetwork(params)
            .then((handle) => handle.switch())
        await this._components.accountController.startSubscriptions()
    }

    public async logOut() {
        await this._components.accountController.logOut()
    }

    private _setupControllerConnection<T extends Duplex>(outStream: T) {
        const api = this.getApi()

        this._activeControllerConnections += 1
        this.emit('controllerConnectionChanged', this._activeControllerConnections)

        outStream.on('data', createMetaRPCHandler(api, outStream))

        const handleUpdate = (params: unknown) => {
            outStream.write({
                jsonrpc: '2.0',
                method: 'sendUpdate',
                params,
            })
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
        let tabId
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

        const connectionId = this._addConnection(origin, { engine })

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
            connectionId && this._removeConnection(origin, connectionId)
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
        engine.push(createLoggerMiddleware({ origin }))

        engine.push(
            createProviderMiddleware({
                origin,
                isInternal,
                approvalController: this._components.approvalController,
                accountController: this._components.accountController,
                connectionController: this._components.connectionController,
                permissionsController: this._components.permissionsController,
            })
        )

        return engine
    }

    private _addConnection(origin: string, { engine }: AddConnectionOptions) {
        if (origin === 'nekoton') {
            return null
        }

        if (!this._connections[origin]) {
            this._connections[origin] = {}
        }

        const id = nanoid()
        this._connections[origin][id] = {
            engine,
        }

        return id
    }

    private _removeConnection(origin: string, id: string) {
        const connections = this._connections[origin]
        if (!connections) {
            return
        }

        delete connections[id]

        if (Object.keys(connections).length === 0) {
            delete this._connections[origin]
        }
    }

    private _notifyConnections<T>(origin: string, payload: T) {
        const connections = this._connections[origin]
        if (connections) {
            Object.values(connections).forEach(({ engine }) => {
                engine.emit('notification', payload)
            })
        }
    }

    private _notifyAllConnections<T extends {}>(
        payload: ((origin: { [id: string]: { engine: JsonRpcEngine } }) => T) | T
    ) {
        const getPayload =
            typeof payload === 'function'
                ? (origin: { [id: string]: { engine: JsonRpcEngine } }) =>
                      (payload as (origin: { [id: string]: { engine: JsonRpcEngine } }) => T)(
                          origin
                      )
                : () => payload

        Object.values(this._connections).forEach((origin) => {
            Object.values(origin).forEach(({ engine }) => {
                engine.emit('notification', getPayload(origin))
            })
        })
    }

    private _debouncedSendUpdate = debounce(this._sendUpdate.bind(this), 200)

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

const createLoggerMiddleware = ({
    origin,
}: CreateLoggerMiddlewareOptions): JsonRpcMiddleware<unknown, unknown> => {
    return (req, res, next, _end) => {
        next((cb) => {
            if (res.error) {
                console.error('Error in RPC response:\n', res)
            }
            if ((req as any).isNekotonInternal) {
                return
            }
            console.info(`RPC (${origin}):`, req, '->', res)
            cb()
        })
    }
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
