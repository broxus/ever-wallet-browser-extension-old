import '../polyfills'

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { Duplex } from 'readable-stream'
import ObjectMultiplex from 'obj-multiplex'
import pump from 'pump'

import { getEnvironmentType } from '@popup/utils/platform'
import { getUniqueId, PortDuplexStream } from '@shared/utils'
import { Environment, ENVIRONMENT_TYPE_BACKGROUND, ENVIRONMENT_TYPE_POPUP } from '@shared/constants'
import { IControllerRpcClient, makeControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import store from '@popup/store'

import App, { ActiveTab } from './App'
import Oval from '@popup/img/oval.svg'

const start = async () => {
    const windowType = getEnvironmentType()
    console.log('Window type', windowType)

    const container = document.getElementById('root')

    const makeConnection = () => {
        return new Promise<PortDuplexStream>((resolve, reject) => {
            console.log('Connecting')

            const extensionPort = chrome.runtime.connect({ name: windowType })
            const connectionStream = new PortDuplexStream(extensionPort)

            const onConnect = () => {
                extensionPort.onMessage.removeListener(onConnect)
                resolve(connectionStream)
            }
            const onDisconnect = () => reject(new Error('Port closed'))

            extensionPort.onMessage.addListener(onConnect)
            extensionPort.onDisconnect.addListener(onDisconnect)

            extensionPort.postMessage({
                name: 'controller',
                data: {
                    id: getUniqueId(),
                    jsonrpc: '2.0',
                    method: 'ping',
                },
            })
        })
    }

    const tryConnect = async () => {
        while (true) {
            try {
                return await makeConnection()
            } catch (e) {
                console.error(e)
                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), 1000)
                })
            }
        }
    }

    if (container != null) {
        const iconSrc = Oval
        container.innerHTML = `<div class="loader-page"><img src="${iconSrc}" class="loader-page__spinner" alt="" /></div>`
    }

    const connectionStream = await tryConnect()

    console.log('Connected')

    const activeTab = await queryCurrentActiveTab(windowType)
    initializeUi(activeTab, connectionStream, (error?: Error) => {
        if (error) {
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
}

const setupControllerConnection = (
    connectionStream: Duplex,
    callback: (error: Error | undefined, controllerRpc: IControllerRpcClient) => void
) => {
    const controllerRpc = makeControllerRpcClient(connectionStream)
    callback(undefined, controllerRpc)
}

start().catch(console.error)
