import '../polyfills'

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'

import { getEnvironmentType } from '@utils'
import App, { ActiveTab } from './App'
import { PortDuplexStream } from '../shared/utils'
import { ENVIRONMENT_TYPE_POPUP } from '../shared/constants'
import { metaRPCClientFactory, IMetaRPCClient } from '@utils/MetaRPCClient'
import store from '@store'
import { StreamProvider } from '@utils/StreamProvider'

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
    window.NEKOTON_PROVIDER = providerStream
}

const setupControllerConnection = (
    connectionStream: Duplex,
    callback: (error: Error | undefined, backgroundRpc: IMetaRPCClient) => void
) => {
    const backgroundRPC = metaRPCClientFactory(connectionStream)
    callback(undefined, backgroundRPC)
}

start().catch(console.error)
