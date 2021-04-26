import '../../polyfills'

import endOfStream from 'end-of-stream'
import init, * as nt from '@nekoton'
import { ENVIRONMENT_TYPE_POPUP, ENVIRONMENT_TYPE_NOTIFICATION } from '../../shared/constants'
import { PortDuplexStream } from '../../shared/utils'
import { StorageConnector } from '../../shared'
import { NotificationManager } from './NotificationManager'
import { NekotonController } from './NekotonController'
import { checkForError } from './utils'

const notificationManager = new NotificationManager()
window.NEKOTON_NOTIFIER = notificationManager

let popupIsOpen: boolean = false
let notificationIsOpen: boolean = false
let uiIsTriggering: boolean = false
const requestAccountTabIds: { [id: string]: number } = {}
const openNekotonTabsIDs: { [id: number]: true } = {}

const initialize = async () => {
    await init('index_bg.wasm')
    await setupController()
}

const setupController = async () => {
    console.log('Setup controller')

    const storage = new nt.Storage(new StorageConnector())
    const accountsStorage = await nt.AccountsStorage.load(storage)
    const keyStore = await nt.KeyStore.load(storage)

    const controller = new NekotonController({
        storage,
        accountsStorage,
        keyStore,
        showUserConfirmation: triggerUi,
        openPopup,
        getRequestAccountTabIds: () => {
            return requestAccountTabIds
        },
        getOpenNekotonTabIds: () => {
            return openNekotonTabsIDs
        },
    })

    chrome.runtime.onConnect.addListener(connectRemote)
    chrome.runtime.onConnectExternal.addListener(connectExternal)

    const nekotonInternalProcessHash: { [type: string]: true } = {
        [ENVIRONMENT_TYPE_POPUP]: true,
        [ENVIRONMENT_TYPE_NOTIFICATION]: true,
    }

    function connectRemote(remotePort: chrome.runtime.Port) {
        const processName = remotePort.name

        const isNekotonInternalProcess = nekotonInternalProcessHash[processName]

        console.log('On remote connect', processName)

        if (isNekotonInternalProcess) {
            const portStream = new PortDuplexStream(remotePort)

            remotePort.sender && controller.setupTrustedCommunication(portStream, remotePort.sender)

            if (processName === ENVIRONMENT_TYPE_POPUP) {
                popupIsOpen = true
                endOfStream(portStream, () => (popupIsOpen = false))
            } else if (processName === ENVIRONMENT_TYPE_NOTIFICATION) {
                notificationIsOpen = true
                endOfStream(portStream, () => (notificationIsOpen = false))
            }
        } else {
            if (remotePort.sender && remotePort.sender.tab && remotePort.sender.url) {
                const tabId = remotePort.sender.tab.id
                const url = new URL(remotePort.sender.url)
                const { origin } = url

                remotePort.onMessage.addListener((msg) => {
                    if (tabId && msg.data && msg.data.method === 'ton_requestAccounts') {
                        requestAccountTabIds[origin] = tabId
                    }
                })
            }
            connectExternal(remotePort)
        }
    }

    function connectExternal(remotePort: chrome.runtime.Port) {
        console.debug('connectExternal')
        const portStream = new PortDuplexStream(remotePort)
        remotePort.sender && controller.setupUntrustedCommunication(portStream, remotePort.sender)
    }
}

const triggerUi = async () => {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve, reject) =>
        chrome.tabs.query({ active: true }, (tabs) => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve(tabs)
            }
        })
    )

    const currentlyActiveNekotonTab = Boolean(
        tabs.find((tab) => tab.id != null && openNekotonTabsIDs[tab.id])
    )

    if (!uiIsTriggering && !popupIsOpen && !currentlyActiveNekotonTab) {
        uiIsTriggering = true
        try {
            await notificationManager.showPopup()
        } finally {
            uiIsTriggering = false
        }
    }
}

const openPopup = async () => {
    await triggerUi()
    await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
            if (!notificationIsOpen) {
                clearInterval(interval)
                resolve()
            }
        }, 1000)
    })
}

initialize().catch(console.error)
