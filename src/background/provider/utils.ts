import { EventEmitter } from 'events'
import {
    JsonRpcEngineNextCallback,
    JsonRpcEngineEndCallback,
    JsonRpcNotification,
    JsonRpcMiddleware,
    JsonRpcRequest,
    PendingJsonRpcResponse,
    JsonRpcEngine,
} from 'json-rpc-engine'
import { Duplex } from 'readable-stream'

export enum RpcErrorCode {
    TRY_AGAIN_LATER,
    INTERNAL_ERROR,
    INVALID_REQUEST,
}

export class RpcError extends Error {
    constructor(public code: RpcErrorCode, public errorMessage: string) {
        super(`RpcError ${code}: ${errorMessage}`)
    }
}

export type Maybe<T> = Partial<T> | null | undefined

export type ConsoleLike = Pick<Console, 'log' | 'warn' | 'error' | 'debug' | 'info' | 'trace'>

type Handler = (...args: any[]) => void

interface EventMap {
    [k: string]: Handler | Handler[] | undefined
}

function safeApply<T, A extends any[]>(
    handler: (this: T, ...args: A) => void,
    context: T,
    args: A
): void {
    try {
        Reflect.apply(handler, context, args)
    } catch (err) {
        // Throw error after timeout so as not to interrupt the stack
        setTimeout(() => {
            throw err
        })
    }
}

function arrayClone<T>(arr: T[]): T[] {
    const n = arr.length
    const copy = new Array(n)
    for (let i = 0; i < n; i += 1) {
        copy[i] = arr[i]
    }
    return copy
}

export class SafeEventEmitter extends EventEmitter {
    emit(type: string, ...args: any[]): boolean {
        let doError = type === 'error'

        const events: EventMap = (this as any)._events
        if (events !== undefined) {
            doError = doError && events.error === undefined
        } else if (!doError) {
            return false
        }

        if (doError) {
            let er
            if (args.length > 0) {
                ;[er] = args
            }
            if (er instanceof Error) {
                throw er
            }

            const err = new Error(`Unhandled error.${er ? ` (${er.message})` : ''}`)
            ;(err as any).context = er
            throw err
        }

        const handler = events[type]

        if (handler === undefined) {
            return false
        }

        if (typeof handler === 'function') {
            safeApply(handler, this, args)
        } else {
            const len = handler.length
            const listeners = arrayClone(handler)
            for (let i = 0; i < len; i += 1) {
                safeApply(listeners[i], this, args)
            }
        }

        return true
    }
}

export const logStreamDisconnectWarning = (
    log: ConsoleLike,
    remoteLabel: string,
    error: Error | undefined,
    emitter: EventEmitter
) => {
    let warningMsg = `Nekoton: Lost connection to "${remoteLabel}".`
    if (error?.stack) {
        warningMsg += `\n${error.stack}`
    }
    log.warn(warningMsg)
    if (emitter && emitter.listenerCount('error') > 0) {
        emitter.emit('error', warningMsg)
    }
}

export const getRpcPromiseCallback = (
    resolve: (value?: any) => void,
    reject: (error?: Error) => void,
    unwrapResult = true
) => (error: Error, response: PendingJsonRpcResponse<unknown>) => {
    if (error || response.error) {
        reject(error || response.error)
    } else {
        !unwrapResult || Array.isArray(response) ? resolve(response) : resolve(response.result)
    }
}

interface EngineStreamOptions {
    engine: JsonRpcEngine
}

export const createEngineStream = (options: EngineStreamOptions): Duplex => {
    if (!options || !options.engine) {
        throw new Error('Missing engine parameter!')
    }

    const { engine } = options
    const stream = new Duplex({ objectMode: true, read, write })

    if (engine.on) {
        engine.on('notification', (message) => {
            stream.push(message)
        })
    }
    return stream

    function read() {
        return undefined
    }

    function write(
        request: JsonRpcRequest<unknown>,
        _encoding: unknown,
        cb: (error?: Error | null) => void
    ) {
        engine.handle(request, (_err, res) => {
            stream.push(res)
        })
        cb()
    }
}

interface IdMapValue {
    req: JsonRpcRequest<unknown>
    res: PendingJsonRpcResponse<unknown>
    next: JsonRpcEngineNextCallback
    end: JsonRpcEngineEndCallback
}

interface IdMap {
    [requestId: string]: IdMapValue
}

export const createStreamMiddleware = () => {
    const idMap: IdMap = {}
    const stream = new Duplex({
        objectMode: true,
        read: readNoop,
        write: processMessage,
    })

    const events = new SafeEventEmitter()

    const middleware: JsonRpcMiddleware<unknown, unknown> = (req, res, next, end) => {
        stream.push(req)
        idMap[(req.id as unknown) as string] = { req, res, next, end }
    }

    return { events, middleware, stream }

    function readNoop() {
        return false
    }

    function processMessage(
        res: PendingJsonRpcResponse<unknown>,
        _encoding: unknown,
        cb: (error?: Error | null) => void
    ) {
        let err
        try {
            const isNotification = !res.id
            if (isNotification) {
                processNotification((res as unknown) as JsonRpcNotification<unknown>)
            } else {
                processResponse(res)
            }
        } catch (_err) {
            err = _err
        }
        cb(err)
    }

    function processResponse(res: PendingJsonRpcResponse<unknown>) {
        const context = idMap[(res.id as unknown) as string]
        if (!context) {
            throw new Error(`StreamMiddleware: Unknown response id "${res.id}"`)
        }

        delete idMap[(res.id as unknown) as string]
        Object.assign(context.res, res)
        setTimeout(context.end)
    }

    function processNotification(res: JsonRpcNotification<unknown>) {
        events.emit('notification', res)
    }
}

export const createErrorMiddleware = (log: ConsoleLike): JsonRpcMiddleware<unknown, unknown> => {
    return (req, res, next) => {
        if (!req.method) {
            res.error = new RpcError(
                RpcErrorCode.INVALID_REQUEST,
                "The request 'method' must be a non-empty string."
            )
        }

        next((done) => {
            const { error } = res
            if (!error) {
                return done()
            }
            log.error(`Nekoton: RPC Error: ${error.message}`, error)
            return done()
        })
    }
}
