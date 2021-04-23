import { Duplex } from 'readable-stream'
import { getUniqueId, JsonRpcError, NekotonRpcError, SafeEventEmitter } from '../../shared/utils'
import { JsonRpcNotification } from '../../shared/jrpc'

import { Approval } from '../../app/background/controllers/ApprovalController'

type MetaRequestCallback<T> = (error: JsonRpcError | undefined, result?: T) => void
type MetaRequest<A extends unknown[], T> = (...args: [...A, MetaRequestCallback<T>]) => void

export interface IMetaRPCClient {
    onNotification(handler: (data: JsonRpcNotification<unknown>) => void): void

    close(): void

    getState: MetaRequest<[string], {}>
    getApproval: MetaRequest<[string], Approval<{ address: string; balance: string }>>
}

class MetaRPCClient<T extends Duplex> {
    _connectionStream: T
    _notificationChannel: SafeEventEmitter = new SafeEventEmitter()
    _requests: Map<number, (error: Error | undefined, result?: unknown) => void> = new Map<
        number,
        (error: Error | undefined, result?: unknown) => void
    >()

    constructor(connectionStream: T) {
        this._connectionStream = connectionStream
        this._connectionStream.on('data', this._handleResponse.bind(this))
    }

    public onNotification(handler: (data: JsonRpcNotification<unknown>) => void) {
        this._notificationChannel.addListener('notification', (data) => {
            handler(data)
        })
    }

    public close() {
        this._notificationChannel.removeAllListeners()
    }

    private _handleResponse(data: {
        id?: number
        result?: unknown
        error?: JsonRpcError
        method?: string
        params?: unknown[]
    }) {
        const { id, result, error, method, params } = data
        const callback = id ? this._requests.get(id) : undefined

        if (method && params && id) {
            // don't handle server-side to client-side requests
            return
        }
        if (method && params && !id) {
            // handle server-side to client-side notification
            this._notificationChannel.emit('notification', data)
            return
        }
        if (!callback) {
            // not found in request list
            return
        }

        if (error) {
            const e = new NekotonRpcError(error.code, error.message, error.data)
            e.stack = error.stack
            id && this._requests.delete(id)
            callback(e)
            return
        }

        id && this._requests.delete(id)
        callback(undefined, result)
    }
}

export const metaRPCClientFactory = <T extends Duplex>(connectionStream: T): IMetaRPCClient => {
    const metaRPCClient = new MetaRPCClient(connectionStream)
    return (new Proxy(metaRPCClient, {
        get: <T extends Duplex>(object: MetaRPCClient<T>, property: keyof MetaRPCClient<T>) => {
            if (object[property]) {
                return object[property]
            }

            return (...args: unknown[]) => {
                const callback = args[args.length - 1] as (
                    error: Error | undefined,
                    result?: unknown
                ) => void
                const params = args.slice(0, -1)
                const id = getUniqueId()

                object._requests.set(id, callback)
                object._connectionStream.write({
                    jsonrpc: '2.0',
                    method: property,
                    params,
                    id,
                })
            }
        },
    }) as unknown) as IMetaRPCClient
}
