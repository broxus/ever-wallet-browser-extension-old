import * as Base64 from 'base64-js'
import * as nt from '../../nekoton/pkg'

export function mergeTransactions(
    knownTransactions: Array<nt.Transaction>,
    newTransactions: Array<nt.Transaction>,
    info: nt.TransactionsBatchInfo
): nt.Transaction[] {
    if (info.batchType == 'old') {
        knownTransactions.push(...newTransactions)
        return knownTransactions
    }

    if (knownTransactions.length === 0) {
        knownTransactions.push(...newTransactions)
        return knownTransactions
    }

    // Example:
    // known lts: [N, N-1, N-2, N-3, (!) N-10,...]
    // new lts: [N-4, N-5]
    // batch info: { minLt: N-5, maxLt: N-4, batchType: 'new' }

    // 1. Skip indices until known transaction lt is greater than the biggest in the batch
    let i = 0
    while (
        i < knownTransactions.length &&
        knownTransactions[i].id.lt.localeCompare(info.maxLt) >= 0
    ) {
        ++i
    }

    // 2. Insert new transactions
    knownTransactions.splice(i, 0, ...newTransactions)
    return knownTransactions
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

export class GqlSocket {
    public async connect(params: GqlSocketParams): Promise<nt.GqlConnection> {
        class GqlSender {
            private readonly params: GqlSocketParams

            constructor(params: GqlSocketParams) {
                this.params = params
            }

            send(data: string, handler: nt.GqlQuery) {
                ;(async () => {
                    try {
                        const response = await fetch(this.params.endpoint, {
                            method: 'post',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: data,
                        }).then((response) => response.text())
                        handler.onReceive(response)
                    } catch (e) {
                        console.log(e)
                        handler.onError(e)
                    }
                })()
            }
        }

        return new nt.GqlConnection(new GqlSender(params))
    }
}

export type GqlSocketParams = {
    // Path to graphql qpi endpoint, e.g. `https://main.ton.dev`
    endpoint: string
    // Request timeout in milliseconds
    timeout: number
}

export class AdnlSocket {
    private readonly port: chrome.runtime.Port
    private receiver: nt.TcpReceiver | null = null

    private onConnected: (() => void) | null = null
    private onClosed: (() => void) | null = null
    private onReceived: ((data: ArrayBuffer) => void) | null = null

    constructor(id: string) {
        this.port = chrome.runtime.connect(id)

        const dispatch: { [K in ResponseType]: (message: ResponseObject<K>) => void } = {
            connected: (_message) => {
                this.onConnected?.()
            },
            received: (message) => {
                this.onReceived?.(unpackData(message.data))
            },
            closed: (_message) => {
                this.onClosed?.()
            },
        }

        this.port.onMessage.addListener((message: Response) => {
            const handler = dispatch[message.type]
            if (handler != null) {
                handler(message as any)
            }
        })
    }

    public async connect(config: Config): Promise<nt.AdnlConnection> {
        class TcpSender {
            constructor(private f: (data: Uint8Array) => void) {}

            send(data: Uint8Array) {
                this.f(data)
            }
        }

        const connect = new Promise<void>((resolve) => {
            this.onConnected = () => resolve()
        })
        this.port.postMessage(new RequestConnect(config))
        await connect
        this.onConnected = null

        const connection = new nt.AdnlConnection(
            new TcpSender((data) => {
                this.port.postMessage(new RequestSend(data))
            })
        )

        let initData!: ArrayBuffer
        let resolveInitialization!: (data: ArrayBuffer) => void
        const initialized = new Promise<void>((resolve) => {
            resolveInitialization = (data) => {
                initData = data
                resolve()
            }
        })

        this.onReceived = resolveInitialization
        this.receiver = connection.init(config.key)
        await initialized

        this.receiver.onReceive(new Uint8Array(initData))

        this.onReceived = this.onReceive

        return connection
    }

    public async close() {
        const close = new Promise<void>((resolve) => {
            this.onClosed = () => resolve()
        })
        this.port.postMessage(new ResponseClosed())
        await close
        this.onClosed = null
    }

    private onReceive = (data: ArrayBuffer) => {
        if (this.receiver != null) {
            this.receiver.onReceive(new Uint8Array(data))
        }
    }
}

export type RequestType = 'connect' | 'send' | 'close'
export type ResponseType = 'connected' | 'received' | 'closed'

export type RequestObject<T extends RequestType> = T extends 'connect'
    ? RequestConnect
    : T extends 'send'
    ? RequestSend
    : T extends 'close'
    ? RequestClose
    : never

export type ResponseObject<T extends ResponseType> = T extends 'connected'
    ? ResponseConnected
    : T extends 'received'
    ? ResponseReceived
    : T extends 'closed'
    ? ResponseClosed
    : never

interface Message<T> {
    readonly type: T
}

export interface Request extends Message<RequestType> {}

export interface Response extends Message<ResponseType> {}

export class RequestConnect implements Request {
    readonly type = 'connect'
    readonly config: Config

    constructor(config: Config) {
        this.config = config
    }
}

export class ResponseConnected implements Response {
    readonly type = 'connected'
}

export class RequestSend implements Request {
    readonly type = 'send'
    readonly data: string

    constructor(data: ArrayBuffer) {
        this.data = packData(data)
    }
}

export class ResponseReceived implements Response {
    readonly type = 'received'
    readonly data: string

    constructor(data: ArrayBuffer) {
        this.data = packData(data)
    }
}

export class RequestClose implements Request {
    readonly type = 'close'
}

export class ResponseClosed implements Response {
    readonly type = 'closed'
}

export type RawConfig = {
    liteservers: Array<{
        id: {
            '@type': 'pub.ed25519'
            'key': string
        }
        ip: number
        port: number
    }>
}

export class Config {
    address!: string
    port!: number
    key!: string

    public static parse(raw: RawConfig): Config {
        if (raw.liteservers.length === 0) {
            throw new Error('No liteservers found')
        }

        const parseIp = (ip: number): string => {
            const a = ip & 0xff
            const b = (ip >> 8) & 0xff
            const c = (ip >> 16) & 0xff
            const d = (ip >> 24) & 0xff
            return `${d}.${c}.${b}.${a}`
        }

        const liteserver = raw.liteservers[0]
        return <Config>{
            address: parseIp(liteserver.ip),
            port: liteserver.port,
            key: liteserver.id.key,
        }
    }
}

export function packData(data: ArrayBuffer): string {
    return Base64.fromByteArray(new Uint8Array(data))
}

export function unpackData(data: string): ArrayBuffer {
    return Base64.toByteArray(data)
}

export class Mutex {
    current: Promise<void> = Promise.resolve()

    public lock = () => {
        let resolveChanged: () => void
        const chained = new Promise<void>((resolve) => {
            resolveChanged = () => resolve()
        })

        const result = this.current.then(() => resolveChanged)
        this.current = chained

        return result
    }
}
