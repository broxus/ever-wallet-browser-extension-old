import ObjectMultiplex from 'obj-multiplex'
import { Duplex } from 'readable-stream'
import { duplex as isDuplex } from 'is-stream'
import pump from 'pump'

import {
    JsonRpcEngine,
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcId,
    JsonRpcVersion,
} from '@shared/jrpc'
import {
    ConsoleLike,
    createIdRemapMiddleware,
    createErrorMiddleware,
    createStreamMiddleware,
    getRpcPromiseCallback,
    logStreamDisconnectWarning,
    Maybe,
    NekotonRpcError,
    SafeEventEmitter,
} from '@shared/utils'
import { NEKOTON_PROVIDER } from '@shared/constants'
import { RpcErrorCode } from '@shared/errors'

interface UnvalidatedJsonRpcRequest {
    id?: JsonRpcId
    jsonrpc?: JsonRpcVersion
    method: string
    params?: unknown
}

export interface NekotonInpageProviderOptions {
    jsonRpcStreamName?: string
    logger?: ConsoleLike
    maxEventListeners?: number
}

export interface RequestArguments {
    method: string
    params?: unknown[] | Record<string, unknown>
}

interface InternalState {
    isConnected: boolean
    isPermanentlyDisconnected: boolean
}

export class NekotonInpageProvider<S extends Duplex> extends SafeEventEmitter {
    private readonly _log: ConsoleLike
    private _state: InternalState
    private _rpcEngine: JsonRpcEngine

    constructor(
        connectionStream: S,
        {
            jsonRpcStreamName = NEKOTON_PROVIDER,
            logger = console,
            maxEventListeners = 100,
        }: NekotonInpageProviderOptions
    ) {
        super()

        if (!isDuplex(connectionStream)) {
            throw new Error('Invalid duplex stream')
        }

        validateLoggerObject(logger)
        this._log = logger

        this.setMaxListeners(maxEventListeners)

        this._state = {
            isConnected: false,
            isPermanentlyDisconnected: false,
        }

        const mux = new ObjectMultiplex()
        pump(
            connectionStream,
            (mux as unknown) as Duplex,
            connectionStream,
            this._handleStreamDisconnect.bind(this, 'Nekoton')
        )

        this.on('connect', () => {
            this._state.isConnected = true
        })

        const jsonRpcConnection = createStreamMiddleware()
        pump(
            jsonRpcConnection.stream,
            (mux.createStream(jsonRpcStreamName) as unknown) as Duplex,
            jsonRpcConnection.stream,
            this._handleStreamDisconnect.bind(this, 'Nekoton RpcProvider')
        )

        const rpcEngine = new JsonRpcEngine()
        rpcEngine.push(createIdRemapMiddleware())
        rpcEngine.push(createErrorMiddleware(this._log))
        rpcEngine.push(jsonRpcConnection.middleware)
        this._rpcEngine = rpcEngine

        jsonRpcConnection.events.on('notification', (payload) => {
            const { method, params } = payload

            this._log.info('Got notification: ', method, params)

            if (method === 'NEKOTON_STREAM_FAILURE') {
                connectionStream.destroy(new Error('Permanently disconnected'))
            } else {
                this.emit(method, params)
            }
        })
    }

    get isConnected(): boolean {
        return this._state.isConnected
    }

    public async request<T>(args: RequestArguments): Promise<Maybe<T>> {
        if (!args || typeof args !== 'object' || Array.isArray(args)) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, 'Invalid request args')
        }

        const { method, params } = args

        if (method.length === 0) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, 'Invalid request method')
        }

        if (
            params !== undefined &&
            !Array.isArray(params) &&
            (typeof params !== 'object' || params === null)
        ) {
            throw new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, 'Invalid request params')
        }

        return new Promise<T>((resolve, reject) => {
            this._rpcRequest({ method, params }, getRpcPromiseCallback(resolve, reject))
        })
    }

    public sendAsync(
        payload: JsonRpcRequest<unknown>,
        callback: (error: Error | null, response?: JsonRpcResponse<unknown>) => void
    ) {
        this._rpcRequest(payload, callback)
    }

    public addListener(eventName: string, listener: (...args: unknown[]) => void) {
        return super.addListener(eventName, listener)
    }

    public on(eventName: string, listener: (...args: unknown[]) => void) {
        return super.on(eventName, listener)
    }

    public once(eventName: string, listener: (...args: unknown[]) => void) {
        return super.once(eventName, listener)
    }

    public prependListener(eventName: string, listener: (...args: unknown[]) => void) {
        return super.prependListener(eventName, listener)
    }

    public prependOnceListener(eventName: string, listener: (...args: unknown[]) => void) {
        return super.prependOnceListener(eventName, listener)
    }

    private _rpcRequest = (
        payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[],
        callback: (...args: any[]) => void
    ) => {
        let cb = callback

        if (!Array.isArray(payload)) {
            if (!payload.jsonrpc) {
                payload.jsonrpc = '2.0'
            }

            // TODO: handle static request

            return this._rpcEngine.handle(payload as JsonRpcRequest<unknown>, cb)
        }
        return this._rpcEngine.handle(payload as JsonRpcRequest<unknown>[], cb)
    }

    private _handleDisconnect = (isRecoverable: boolean, errorMessage?: string) => {
        let error
        if (isRecoverable) {
            error = new NekotonRpcError(
                RpcErrorCode.TRY_AGAIN_LATER,
                errorMessage || 'Disconnected'
            )
        } else {
            error = new NekotonRpcError(
                RpcErrorCode.INTERNAL,
                errorMessage || 'Permanently disconnected'
            )
        }

        this.emit('disconnected', error)
    }

    private _handleStreamDisconnect = (streamName: string, error: Error | undefined) => {
        logStreamDisconnectWarning(this._log, streamName, error, this)
        this._handleDisconnect(false, error?.message)
    }
}

const validateLoggerObject = (logger: ConsoleLike) => {
    if (logger !== console) {
        if (typeof logger === 'object') {
            const methodKeys = ['log', 'warn', 'error', 'debug', 'info', 'trace']
            for (const key of methodKeys) {
                if (typeof logger[key as keyof ConsoleLike] !== 'function') {
                    throw new Error(`Invalid logger method: "${key}"`)
                }
            }
            return
        }
        throw new Error('Invalid logger object')
    }
}
