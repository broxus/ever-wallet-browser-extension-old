import '../polyfills'

import LocalMessageDuplexStream from 'post-message-stream'
import ObjectMultiplex from 'obj-multiplex'
import { Duplex } from 'readable-stream'
import pump from 'pump'

const CONTENT_SCRIPT = 'nekoton-contentscript'
const INPAGE_SCRIPT = 'nekoton-inpage'
const PROVIDER = 'nekoton-provider'

class PortDuplexStream extends Duplex {
    private port: chrome.runtime.Port

    constructor(port: chrome.runtime.Port) {
        super({ objectMode: true })
        this.port = port
        this.port.onMessage.addListener((msg: unknown) => this.onMessage(msg))
        this.port.onDisconnect.addListener(() => this.onDisconnect())
    }

    private onMessage(msg: unknown) {
        if (Buffer.isBuffer(msg)) {
            const data: Buffer = Buffer.from(msg)
            this.push(data)
        } else {
            this.push(msg)
        }
    }

    private onDisconnect() {
        this.destroy()
    }

    _read(_size?: number) {
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

const logStreamDisconnectWarning = (remoteLabel: string, error?: Error) => {
    console.debug(`Nekoton: Content script lost connection to "${remoteLabel}"`, error)
}

const checkDoctype = () => {
    const { doctype } = window.document
    if (doctype) {
        return doctype.name === 'html'
    }
    return true
}

const checkSuffix = () => {
    const excludedTypes = [/\.xml$/u, /\.pdf$/u]
    const currentUrl = window.location.pathname
    for (const type of excludedTypes) {
        if (type.test(currentUrl)) {
            return false
        }
    }
    return true
}

const checkDocymentElement = () => {
    const documentElement = document.documentElement.nodeName
    if (documentElement) {
        return documentElement.toLowerCase() === 'html'
    }
    return true
}

const shouldInjectProvider = () => checkDoctype() && checkSuffix() && checkDocymentElement()

const injectScript = () => {
    try {
        const container = document.head || document.documentElement
        const scriptTag = document.createElement('script')
        scriptTag.src = chrome.extension.getURL('inpage.js')
        scriptTag.setAttribute('async', 'false')
        container.insertBefore(scriptTag, container.children[0])
        container.removeChild(scriptTag)
    } catch (e) {
        console.error('Nekoton: Provider injection failed', e)
    }
}

const forwardTrafficBetweenMutexes = (
    channelName: string,
    a: ObjectMultiplex,
    b: ObjectMultiplex
) => {
    const channelA = a.createStream(channelName)
    const channelB = b.createStream(channelName)
    pump(channelA, channelB, channelA, (e) => {
        console.debug(`Nekoton: Muxed traffix for channel "${channelName}" failed`, e)
    })
}

const notifyInpageOfStreamFailure = () => {
    window.postMessage(
        {
            target: INPAGE_SCRIPT,
            data: {
                name: PROVIDER,
                data: {
                    jsonrpc: '2.0',
                    method: 'NEKOTON_STREAM_FAILURE',
                },
            },
        },
        window.location.origin
    )
}

const setupStreams = () => {
    const pageStream = new LocalMessageDuplexStream({
        name: CONTENT_SCRIPT,
        target: INPAGE_SCRIPT,
    })
    const extensionPort = chrome.runtime.connect({ name: CONTENT_SCRIPT })
    const extensionStream = new PortDuplexStream(extensionPort)

    const pageMux = new ObjectMultiplex()
    pageMux.setMaxListeners(25)
    const extensionMux = new ObjectMultiplex()
    extensionMux.setMaxListeners(25)

    pump(pageMux, pageStream, pageMux, (e) => {
        logStreamDisconnectWarning('Nekoton inpage multiplex', e)
    })
    pump(extensionMux, extensionStream, extensionMux, (e) => {
        logStreamDisconnectWarning('Nekoton background multiplex', e)
        notifyInpageOfStreamFailure()
    })

    forwardTrafficBetweenMutexes(PROVIDER, pageMux, extensionMux)
}

if (shouldInjectProvider()) {
    injectScript()
}
