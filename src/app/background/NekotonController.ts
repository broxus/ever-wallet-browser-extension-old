import { EventEmitter } from 'events'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'
import { nanoid } from 'nanoid'
import * as nt from '@nekoton'

import {
    DestroyableMiddleware,
    JsonRpcEngine,
    JsonRpcFailure,
    JsonRpcMiddleware,
    JsonRpcRequest,
    JsonRpcSuccess,
} from '../../shared/jrpc'
import {
    createEngineStream,
    NekotonRpcError,
    nodeify,
    RpcErrorCode,
    serializeError,
} from '../../shared/utils'
import { NEKOTON_PROVIDER } from '../../shared/constants'
import { ApplicationState } from './ApplicationState'
import { ApprovalController } from './controllers/ApprovalController'

interface NekotonControllerOptions {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
    showUserConfirmation: () => void
    openPopup: () => void
    getRequestAccountTabIds: () => { [origin: string]: number }
    getOpenNekotonTabIds: () => { [id: number]: true }
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

    private _options: NekotonControllerOptions
    private _applicationState: ApplicationState

    private _approvalController: ApprovalController

    constructor(options: NekotonControllerOptions) {
        super()

        this._defaultMaxListeners = 20
        this._activeControllerConnections = 0

        this._connections = {}

        this._options = options

        this._applicationState = new ApplicationState({
            storage: options.storage,
            accountsStorage: options.accountsStorage,
            keyStore: options.keyStore,
        })

        this._approvalController = new ApprovalController({
            showApprovalRequest: options.showUserConfirmation,
        })

        this.on('controllerConnectionChanged', (activeControllerConnections: number) => {
            if (activeControllerConnections > 0) {
                // TODO: start account tracker
            } else {
                // TODO: stop account tracker
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
        return {
            resolvePendingApproval: nodeify(
                this._approvalController.resolve,
                this._approvalController
            ),
            rejectPendingApproval: nodeify(
                this._approvalController.reject,
                this._approvalController
            ),
        }
    }

    private _setupControllerConnection<T extends Duplex>(outStream: T) {
        const api = this.getApi()

        this._activeControllerConnections += 1
        this.emit('controllerConnectionChanged', this._activeControllerConnections)

        outStream.on('data', createMetaRPCHandler(api, outStream))

        const handleUpdate = (update: unknown) => {
            outStream.push({
                jsonrpc: '2.0',
                method: 'sendUpdate',
                params: [update],
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

    private _setupProviderEngine({ origin, tabId }: SetupProviderEngineOptions) {
        const engine = new JsonRpcEngine()

        engine.push(createOriginMiddleware({ origin }))
        if (tabId) {
            engine.push(createTabIdMiddleware({ tabId }))
        }
        engine.push(createLoggerMiddleware({ origin }))

        engine.push((req, res, next, end) => {
            console.log(req, res, next, end)
            next()
        })

        // TODO: add provider

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

        if (![data.method as MethodName]) {
            outStream.write(<JsonRpcFailure>{
                jsonrpc: '2.0',
                error: new NekotonRpcError(
                    RpcErrorCode.METHOD_NOT_FOUND,
                    `${data.method} not found`
                ),
                id: data.id,
            })
        }

        api[data.method as MethodName](
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
