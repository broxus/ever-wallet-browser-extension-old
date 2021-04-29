import { Duplex } from 'readable-stream'
import { nanoid } from 'nanoid'
import { JsonRpcId, JsonRpcRequest, JsonRpcResponse } from '@shared/jrpc'

export class StreamProvider extends Duplex {
    private _payloads: {
        [id: string]: [(error: Error | null, response: unknown) => void, JsonRpcId]
    } = {}

    constructor() {
        super({ objectMode: true })
    }

    send<T>(payload: JsonRpcRequest<T>) {
        throw new Error(
            `StreamProvider does not support syncronous RPC calls. called ${payload.method}`
        )
    }

    sendAsync(
        payload: JsonRpcRequest<unknown>,
        callback: (error: Error | null, response: unknown) => void
    ) {
        const originalId = payload.id
        const id = nanoid()
        payload.id = id
        this._payloads[id] = [callback, originalId]
        this.push(payload)
    }

    private _onResponse(response: JsonRpcResponse<unknown>) {
        const id = response.id
        const data = this._payloads[id as string]
        const callback = data[0]
        response.id = data[1]
        setTimeout(function () {
            callback(null, response)
        })
    }

    _read(_size?: number) {
        return undefined
    }

    _write(message: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        this._onResponse(message as JsonRpcResponse<unknown>)
        callback()
    }
}
