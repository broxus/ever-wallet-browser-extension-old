import '../polyfills'

import _ from 'lodash'
import safeStringify from 'fast-safe-stringify'
import { EventEmitter } from 'events'
import { Duplex } from 'readable-stream'
import promiseToCallback from 'promise-to-callback'
import Decimal from 'decimal.js'

import { RpcErrorCode } from './errors'
import {
    JsonRpcEngineNextCallback,
    JsonRpcEngineEndCallback,
    JsonRpcNotification,
    JsonRpcMiddleware,
    JsonRpcRequest,
    PendingJsonRpcResponse,
    JsonRpcEngine,
} from './jrpc'
import * as nt from '@nekoton'

export const ONE_TON = '1000000000'

const MAX = 4294967295

let idCounter = Math.floor(Math.random() * MAX)

export const getUniqueId = (): number => {
    idCounter = (idCounter + 1) % MAX
    return idCounter
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

const callbackNoop = (error?: Error) => {
    if (error) {
        throw error
    }
}

type NodeifyAsyncResult<F> = F extends (...args: infer T) => Promise<infer U>
    ? (...args: [...T, (error: Error | null, result?: U) => void]) => void
    : never

export const nodeifyAsync = <C extends {}, M extends keyof C>(
    context: C,
    method: M
): NodeifyAsyncResult<C[M]> => {
    const fn = (context[method] as unknown) as (...args: any[]) => Promise<any>
    return (function (...args: any[]) {
        const lastArg = args[args.length - 1]
        const lastArgIsCallback = typeof lastArg === 'function'

        let callback
        if (lastArgIsCallback) {
            callback = lastArg
            args.pop()
        } else {
            callback = callbackNoop
        }

        promiseToCallback(fn.apply(context, args))(callback)
    } as unknown) as NodeifyAsyncResult<C[M]>
}

type NodeifyResult<F> = F extends (
    ...args: [...infer T, (error: Error | null, result?: infer U) => void]
) => void
    ? (...args: [...T, (error: Error | null, result?: U) => void]) => void
    : F extends (...args: infer T) => void
    ? (...args: [...T, (error: Error | null, result: undefined) => void]) => void
    : never

export const nodeify = <C extends {}, M extends keyof C>(
    context: C,
    method: M
): NodeifyResult<C[M]> => {
    const fn = (context[method] as unknown) as Function
    return (function (...args: any[]) {
        const lastArg = args[args.length - 1]
        const lastArgIsCallback = typeof lastArg === 'function'

        let callback
        if (lastArgIsCallback) {
            callback = lastArg
            args.pop()
        } else {
            callback = callbackNoop
        }

        let result
        try {
            result = Promise.resolve(fn.apply(context, args))
        } catch (e) {
            result = Promise.reject(e)
        }
        promiseToCallback(result)(callback)
    } as unknown) as NodeifyResult<C[M]>
}

export class PortDuplexStream extends Duplex {
    private port: chrome.runtime.Port

    constructor(port: chrome.runtime.Port) {
        super({ objectMode: true })
        this.port = port
        this.port.onMessage.addListener((msg: unknown) => this._onMessage(msg))
        this.port.onDisconnect.addListener(() => {
            console.log('onDisconnect')
            this._onDisconnect()
        })
    }

    private _onMessage(msg: unknown) {
        if (Buffer.isBuffer(msg)) {
            const data: Buffer = Buffer.from(msg)
            this.push(data)
        } else {
            this.push(msg)
        }
    }

    private _onDisconnect() {
        this.destroy()
    }

    _read() {
        return undefined
    }

    _write(message: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        try {
            if (Buffer.isBuffer(message)) {
                const data: Record<string, unknown> = message.toJSON()
                data._isBuffer = true
                this.port.postMessage(data)
            } else {
                this.port.postMessage(message)
            }
        } catch (e) {
            return callback(new Error('PortDuplexStream - disconnected'))
        }
        return callback()
    }
}

export const checkForError = () => {
    const { lastError } = chrome.runtime
    if (!lastError) {
        return undefined
    }
    if ((lastError as any).stack && lastError.message) {
        return lastError
    }
    return new Error(lastError.message)
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
    const stream = new Duplex({
        objectMode: true,
        read: () => {
            return false
        },
        write: (
            request: JsonRpcRequest<unknown>,
            _encoding: unknown,
            cb: (error?: Error | null) => void
        ) => {
            engine.handle(request, (_err, res) => {
                stream.push(res)
            })
            cb()
        },
    })

    if (engine.on) {
        engine.on('notification', (message) => {
            stream.push(message)
        })
    }

    return stream
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
            res.error = new NekotonRpcError(
                RpcErrorCode.INVALID_REQUEST,
                "The request 'method' must be a non-empty string."
            )
        }

        next((done) => {
            const { error } = res
            if (!error) {
                return done()
            }
            log.debug(`Nekoton: RPC Error: ${error.message}`, error)
            return done()
        })
    }
}

export const createIdRemapMiddleware = (): JsonRpcMiddleware<unknown, unknown> => {
    return (req, res, next, _end) => {
        const originalId = req.id
        const newId = getUniqueId()
        req.id = newId
        res.id = newId
        next((done) => {
            req.id = originalId
            res.id = originalId
            done()
        })
    }
}

export interface JsonRpcError {
    code: number
    message: string
    data?: unknown
    stack?: string
}

export class NekotonRpcError<T> extends Error {
    code: number
    data?: T

    constructor(code: number, message: string, data?: T) {
        if (!Number.isInteger(code)) {
            throw new Error('"code" must be an integer')
        }

        if (!message || (typeof message as any) !== 'string') {
            throw new Error('"message" must be a nonempty string')
        }

        super(message)

        this.code = code
        this.data = data
    }

    serialize(): JsonRpcError {
        const serialized: JsonRpcError = {
            code: this.code,
            message: this.message,
        }
        if (this.data !== undefined) {
            serialized.data = this.data
        }
        if (this.stack) {
            serialized.stack = this.stack
        }
        return serialized
    }

    toString(): string {
        return safeStringify(this.serialize(), stringifyReplacer, 2)
    }
}

const FALLBACK_ERROR: JsonRpcError = {
    code: RpcErrorCode.INTERNAL,
    message: 'Unspecified error message',
}

export const serializeError = (
    error: unknown,
    { fallbackError = FALLBACK_ERROR, shouldIncludeStack = false } = {}
): JsonRpcError => {
    if (
        !fallbackError ||
        !Number.isInteger(fallbackError.code) ||
        (typeof fallbackError.message as any) !== 'string'
    ) {
        throw new Error('Must provide fallback error with integer number code and string message')
    }

    if (error instanceof NekotonRpcError) {
        return error.serialize()
    }

    const serialized: Partial<JsonRpcError> = {}

    if (
        error &&
        typeof error === 'object' &&
        !Array.isArray(error) &&
        hasKey(error as Record<string, unknown>, 'code')
    ) {
        const typedError = error as Partial<JsonRpcError>
        serialized.code = typedError.code

        if (typedError.message && (typeof typedError.message as any) === 'string') {
            serialized.message = typedError.message

            if (hasKey(typedError, 'data')) {
                serialized.data = typedError.data
            }
        } else {
            serialized.message = 'TODO: get message from code'

            serialized.data = { originalError: assignOriginalError(error) }
        }
    } else {
        serialized.code = fallbackError.code

        const message = (error as any)?.message

        serialized.message =
            message && typeof message === 'string' ? message : fallbackError.message
        serialized.data = { originalError: assignOriginalError(error) }
    }

    const stack = (error as any)?.stack

    if (shouldIncludeStack && error && stack && (typeof stack as any) === 'stack') {
        serialized.stack = stack
    }

    return serialized as JsonRpcError
}

export const jsonify = <T extends {}>(request: T): string => {
    return safeStringify(request, stringifyReplacer, 2)
}

const stringifyReplacer = (_: unknown, value: unknown): unknown => {
    if (value === '[Circular]') {
        return undefined
    }
    return value
}

const assignOriginalError = (error: unknown): unknown => {
    if (error && typeof error === 'object' && !Array.isArray(error)) {
        return Object.assign({}, error)
    }
    return error
}

const hasKey = (obj: Record<string, unknown>, key: string) => {
    return Object.prototype.hasOwnProperty.call(obj, key)
}

export type UniqueArray<T> = T extends readonly [infer X, ...infer Rest]
    ? InArray<Rest, X> extends true
        ? ['Encountered value with duplicates:', X]
        : readonly [X, ...UniqueArray<Rest>]
    : T

export type InArray<T, X> = T extends readonly [X, ...infer _Rest]
    ? true
    : T extends readonly [X]
    ? true
    : T extends readonly [infer _, ...infer Rest]
    ? InArray<Rest, X>
    : false

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
    ...args: any
) => Promise<infer R>
    ? R
    : any

export const shuffleArray = <T>(array: T[]) => {
    let currentIndex = array.length
    let temporaryValue: T
    let randomIndex: number

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex -= 1

        temporaryValue = array[currentIndex]
        array[currentIndex] = array[randomIndex]
        array[randomIndex] = temporaryValue
    }

    return array
}

export const extractTransactionValue = (transaction: nt.Transaction) => {
    const outgoing = transaction.outMessages.reduce(
        (total, msg) => total.add(msg.value),
        new Decimal(0)
    )
    return new Decimal(transaction.inMessage.value).sub(outgoing)
}

export type TransactionDirection = 'from' | 'to' | 'service'

export const extractTransactionAddress = (
    transaction: nt.Transaction
): { direction: TransactionDirection; address: string } => {
    for (const item of transaction.outMessages) {
        if (item.dst != null) {
            return { direction: 'to', address: item.dst }
        }
    }

    if (transaction.inMessage.src != null) {
        return { direction: 'from', address: transaction.inMessage.src }
    } else {
        return { direction: 'service', address: transaction.inMessage.dst || '' }
    }
}

const OUTGOING_TOKEN_TRANSACTION_TYPES: Exclude<
    nt.TokenWalletTransaction['info'],
    undefined
>['type'][] = ['outgoing_transfer', 'swap_back']

export const extractTokenTransactionValue = ({ info }: nt.TokenWalletTransaction) => {
    if (info == null) {
        return undefined
    }

    const tokens = new Decimal(info.data.tokens)
    if (OUTGOING_TOKEN_TRANSACTION_TYPES.includes(info.type)) {
        return tokens.negated()
    } else {
        return tokens
    }
}

export type TokenTransactionAddress =
    | undefined
    | nt.TransferRecipient
    | { type: 'eth_account'; address: string }

export const extractTokenTransactionAddress = ({
    info,
}: nt.TokenWalletTransaction): TokenTransactionAddress => {
    if (info == null) {
        return undefined
    }

    if (info.type == 'incoming_transfer') {
        return { type: 'owner_wallet', address: info.data.senderAddress }
    } else if (info.type == 'outgoing_transfer') {
        return info.data.to
    } else if (info.type == 'swap_back') {
        return { type: 'eth_account', address: info.data.to }
    } else {
        return undefined
    }
}

export const convertPublicKey = (publicKey: string | undefined) =>
    publicKey ? `${publicKey?.slice(0, 4)}...${publicKey?.slice(-4)}` : ''

export const convertAddress = (address: string | undefined) =>
    address ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : ''

export const trimTokenName = (token: string | undefined) =>
    token ? `${token?.slice(0, 4)}...${token?.slice(-4)}` : ''

export const multiplier = _.memoize((decimals: number) => new Decimal(10).pow(decimals))

export const amountPattern = _.memoize(
    (decimals: number) => new RegExp(`^(?:0|[1-9][0-9]*)(?:.[0-9]{0,${decimals}})?$`)
)

export const convertTons = (amount?: string) => convertCurrency(amount, 9)

export const convertCurrency = (amount: string | undefined, decimals: number) =>
    new Decimal(amount || '0').div(multiplier(decimals)).toFixed()

export const parseTons = (amount: string) => parseCurrency(amount, 9)

export const parseCurrency = (amount: string, decimals: number) => {
    return new Decimal(amount).mul(multiplier(decimals)).ceil().toFixed(0)
}

export interface SendMessageRequest {
    expireAt: number
    boc: string
}

export interface SendMessageCallback {
    resolve: (transaction: nt.Transaction) => void
    reject: (error?: Error) => void
}

export type SelectedAsset =
    | nt.EnumItem<'ton_wallet', { address: string }>
    | nt.EnumItem<'token_wallet', { owner: string; rootTokenContract: string }>

export type AssetType = SelectedAsset['type']

export interface TokenWalletState {
    balance: string
}
