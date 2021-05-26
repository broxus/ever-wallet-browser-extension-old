import '../polyfills'

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'

import { getEnvironmentType } from '@popup/utils/platform'
import { PortDuplexStream } from '@shared/utils'
import {
    Environment,
    ENVIRONMENT_TYPE_BACKGROUND,
    ENVIRONMENT_TYPE_FULLSCREEN,
    ENVIRONMENT_TYPE_POPUP,
} from '@shared/constants'
import { IControllerRpcClient, makeControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { StreamProvider } from '@popup/utils/StreamProvider'
import store from '@popup/store'

import App, { ActiveTab } from './App'

const start = async () => {
    const windowType = getEnvironmentType()
    console.log('Window type', windowType)

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

const queryCurrentActiveTab = async (windowType: Environment) => {
    return new Promise<ActiveTab>((resolve) => {
        if (windowType === ENVIRONMENT_TYPE_FULLSCREEN) {
            const route = window.location.hash.replace('#', '')
            return resolve({
                type: windowType,
                data: {
                    route: route != '' ? route : undefined,
                },
            })
        }

        if (windowType !== ENVIRONMENT_TYPE_POPUP) {
            return resolve({ type: windowType } as any)
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const [activeTab] = tabs
            const { id, title, url } = activeTab
            const { origin, protocol } = url
                ? new URL(url)
                : { origin: undefined, protocol: undefined }

            if (!origin || origin == 'null') {
                return resolve({ type: ENVIRONMENT_TYPE_BACKGROUND } as any)
            }

            resolve({ type: windowType, data: { id, title, origin, protocol, url } })
        })
    })
}

const initializeUi = (
    activeTab: ActiveTab,
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
                    <App activeTab={activeTab} controllerRpc={backgroundConnection} />
                </Provider>
            </React.StrictMode>,
            document.getElementById('root')
        )
    })
}

const connectToBackground = (
    connectionStream: Duplex,
    callback: (error: Error | undefined, controllerRpc: IControllerRpcClient) => void
) => {
    const mux = new ObjectMultiplex()
    pump(connectionStream, mux, connectionStream, (error) => {
        if (error) {
            console.error(error)
        }
    })

    setupControllerConnection((mux.createStream('controller') as unknown) as Duplex, callback)
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
    callback: (error: Error | undefined, controllerRpc: IControllerRpcClient) => void
) => {
    const controllerRpc = makeControllerRpcClient(connectionStream)
    callback(undefined, controllerRpc)
}

start().catch(console.error)
