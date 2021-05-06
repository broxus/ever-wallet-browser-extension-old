;(window as Record<string, any>).hasTonProvider = true

import '../../polyfills'

import endOfStream from 'end-of-stream'
import init from '@nekoton'
import { PortDuplexStream, checkForError } from '@shared/utils'
import {
    ENVIRONMENT_TYPE_POPUP,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_BACKGROUND,
    ENVIRONMENT_TYPE_FULLSCREEN,
} from '@shared/constants'

import { NotificationManager, openExtensionInBrowser } from '@popup/utils/platform'
import { NekotonController } from './NekotonController'

const notificationManager = new NotificationManager()

let popupIsOpen: boolean = false
let notificationIsOpen: boolean = false
let uiIsTriggering: boolean = false
const openNekotonTabsIDs: { [id: number]: true } = {}

const initialize = async () => {
    await init('index_bg.wasm')
    await setupController()
}

const setupController = async () => {
    console.log('Setup controller')

    const controller = await NekotonController.load({
        showUserConfirmation: triggerUi,
        openPopup,
        getOpenNekotonTabIds: () => {
            return openNekotonTabsIDs
        },
    })

    chrome.runtime.onConnect.addListener(connectRemote)
    chrome.runtime.onConnectExternal.addListener(connectExternal)

    const nekotonInternalProcessHash: { [type: string]: true } = {
        [ENVIRONMENT_TYPE_POPUP]: true,
        [ENVIRONMENT_TYPE_NOTIFICATION]: true,
        [ENVIRONMENT_TYPE_FULLSCREEN]: true,
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
            } else if (processName === ENVIRONMENT_TYPE_FULLSCREEN) {
                const tabId = remotePort.sender?.tab?.id
                if (tabId != null) {
                    openNekotonTabsIDs[tabId] = true
                }
                endOfStream(portStream, () => {
                    tabId != null && delete openNekotonTabsIDs[tabId]
                })
            }
        } else {
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

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install' && !(process.env.NEKOTON_DEBUG || process.env.IN_TEST)) {
        openExtensionInBrowser().catch(console.error)
    }
})