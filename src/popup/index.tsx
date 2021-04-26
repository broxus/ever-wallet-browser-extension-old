import '../polyfills'

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import { nanoid } from 'nanoid'
import pump from 'pump'

import { getEnvironmentType } from '@utils'
import App, { ActiveTab } from './App'
import { PortDuplexStream } from '../shared/utils'
import { ENVIRONMENT_TYPE_POPUP } from '../shared/constants'
import { JsonRpcId, JsonRpcRequest, JsonRpcResponse } from '../shared/jrpc'
import { metaRPCClientFactory, IMetaRPCClient } from '@utils/MetaRPCClient'
import store from '@store'

const start = async () => {
    const windowType = getEnvironmentType()

    const extensionPort = chrome.runtime.connect({ name: windowType })
    const connectionStream = new PortDuplexStream(extensionPort)

    const activeTab = await queryCurrentActiveTab(windowType)
    initializeUi(activeTab, connectionStream, (error?: Error) => {
        if (error) {
            const container = document.getElementById('root')
            if (container) {
                container.innerHTML =
                    '<div class="critical-error">The Nekoton app failed to load: please open and close Nekoton again to restart.</div>'
                container.style.height = '80px'
            }
            console.error(error.stack)
            throw error
        }
    })
}

const queryCurrentActiveTab = async (windowType: string) => {
    return new Promise<ActiveTab | undefined>((resolve) => {
        if (windowType !== ENVIRONMENT_TYPE_POPUP) {
            return resolve(undefined)
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const [activeTab] = tabs
            const { id, title, url } = activeTab
            const { origin, protocol } = url
                ? new URL(url)
                : { origin: undefined, protocol: undefined }

            if (!origin || origin == 'null') {
                return resolve(undefined)
            }

            resolve({ id, title, origin, protocol, url })
        })
    })
}

const initializeUi = (
    activeTab: ActiveTab | undefined,
    connectionStream: Duplex,
    callback: (error: Error | undefined) => void
) => {
    connectToBackground(connectionStream, (error, backgroundConnection) => {
        if (error) {
            callback(error)
        }

        ReactDOM.render(
            <React.StrictMode>
                <Provider store={store}>
                    <App activeTab={activeTab} backgroundConnection={backgroundConnection} />
                </Provider>
            </React.StrictMode>,
            document.getElementById('root')
        )
    })
}

const connectToBackground = (
    connectionStream: Duplex,
    cb: (error: Error | undefined, backgroundRpc: IMetaRPCClient) => void
) => {
    connectionStream.on('data', (data) => {
        console.log('Connection stream data:', data)
    })

    const mux = new ObjectMultiplex()
    pump(connectionStream, mux, connectionStream, (error) => {
        if (error) {
            console.error(error)
        }
    })

    setupControllerConnection((mux.createStream('controller') as unknown) as Duplex, cb)
    setupWeb3Connection(mux.createStream('provider'))
}

const setupWeb3Connection = <T extends Duplex>(connectionStream: T) => {
    const providerStream = new StreamProvider()
    pump(providerStream, connectionStream, providerStream, (error) => {
        if (error) {
            console.error(error)
        }
    })
}

const setupControllerConnection = (
    connectionStream: Duplex,
    callback: (error: Error | undefined, backgroundRpc: IMetaRPCClient) => void
) => {
    const backgroundRPC = metaRPCClientFactory(connectionStream)
    callback(undefined, backgroundRPC)
}

class StreamProvider extends Duplex {
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

start().catch(console.error)
