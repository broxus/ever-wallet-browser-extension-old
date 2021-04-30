import { Duplex } from 'readable-stream'
import { getUniqueId, JsonRpcError, NekotonRpcError, SafeEventEmitter } from '@shared/utils'
import { JsonRpcNotification } from '@shared/jrpc'

import { NekotonController } from '../../app/background/NekotonController'

type ApiHandlers = ReturnType<typeof NekotonController.prototype.getApi>

export type ApiMethodName = keyof ApiHandlers
export type ApiMethodParam<T> = T extends Error ? JsonRpcError : T
export type ApiMethod<P extends ApiMethodName> = ApiHandlers[P] extends (
    ...args: [...infer T, (error: Error | null, result?: infer U) => void]
) => void
    ? (...args: [...ApiMethodParam<T>]) => Promise<U>
    : never

export type ControllerState = ReturnType<typeof NekotonController.prototype.getState>

type ClientMethods = {
    onNotification(handler: (data: JsonRpcNotification<unknown>) => void): void
    close(): void
}

type ControllerRpcMethods = {
    [P in ApiMethodName]: ApiMethod<P>
}

export type IControllerRpcClient = {
    [k in keyof ClientMethods | keyof ControllerRpcMethods]: k extends keyof ClientMethods
        ? ClientMethods[k]
        : k extends keyof ControllerRpcMethods
        ? ControllerRpcMethods[k]
        : never
}

class ControllerRpcClient<T extends Duplex> {
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

export const makeControllerRpcClient = <T extends Duplex>(
    connectionStream: T
): IControllerRpcClient => {
    const metaRPCClient = new ControllerRpcClient(connectionStream)
    return (new Proxy(metaRPCClient, {
        get: <T extends Duplex>(
            object: ControllerRpcClient<T>,
            property: keyof ControllerRpcClient<T>
        ) => {
            if (object[property]) {
                return object[property]
            }

            return (...args: unknown[]) =>
                new Promise<unknown>((resolve, reject) => {
                    const id = getUniqueId()

                    object._requests.set(id, (error: Error | undefined, result?: unknown) => {
                        if (error != null) {
                            reject(error)
                        } else {
                            resolve(result)
                        }
                    })
                    object._connectionStream.write({
                        jsonrpc: '2.0',
                        method: property,
                        params: args,
                        id,
                    })
                })
        },
    }) as unknown) as IControllerRpcClient
}
