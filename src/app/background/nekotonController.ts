import { EventEmitter } from 'events'
import { Mutex } from 'await-semaphore'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'
import { nanoid } from 'nanoid'
import { DestroyableMiddleware, JsonRpcEngine, JsonRpcMiddleware } from '../../shared/jrpc'
import { createEngineStream } from '../../shared/utils'
import { NEKOTON_PROVIDER } from '../../shared/constants'

interface NekotonControllerOptions {
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

    constructor(options: NekotonControllerOptions) {
        super()

        this._defaultMaxListeners = 20
        this._activeControllerConnections = 0

        this._connections = {}

        this._options = options

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

    private _setupControllerConnection<T extends Duplex>(outStream: T) {
        this._activeControllerConnections += 1
        this.emit('controllerConnectionChanged', this._activeControllerConnections)

        //outStream.on('data');

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
