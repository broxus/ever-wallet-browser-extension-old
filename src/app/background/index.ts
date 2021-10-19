;(window as Record<string, any>).hasTonProvider = true

import '../../polyfills'

import endOfStream from 'end-of-stream'
import init from '@nekoton'
import type browser from 'webextension-polyfill'
import { PortDuplexStream } from '@shared/utils'
import {
    ENVIRONMENT_TYPE_POPUP,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_FULLSCREEN,
} from '@shared/constants'

import { WindowManager, openExtensionInBrowser } from '@popup/utils/platform'
import { NekotonController, TriggerUiParams } from './NekotonController'

const windowManager = new WindowManager()

let popupIsOpen: boolean = false
let notificationIsOpen: boolean = false
let uiIsTriggering: boolean = false
const openNekotonTabsIDs: { [id: number]: true } = {}

const initialize = async () => {
    await init()
    await setupController()
}

const setupController = async () => {
    console.log('Setup controller')

    const controller = await NekotonController.load({
        windowManager,
        openExternalWindow: triggerUi,
        getOpenNekotonTabIds: () => {
            return openNekotonTabsIDs
        },
    })

    window.browser.runtime.onConnect.addListener(connectRemote)
    window.browser.runtime.onConnectExternal.addListener(connectExternal)

    const nekotonInternalProcessHash: { [type: string]: true } = {
        [ENVIRONMENT_TYPE_POPUP]: true,
        [ENVIRONMENT_TYPE_NOTIFICATION]: true,
        [ENVIRONMENT_TYPE_FULLSCREEN]: true,
    }

    function connectRemote(remotePort: browser.Runtime.Port) {
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

    function connectExternal(remotePort: browser.Runtime.Port) {
        console.debug('connectExternal')
        const portStream = new PortDuplexStream(remotePort)
        remotePort.sender && controller.setupUntrustedCommunication(portStream, remotePort.sender)
    }
}

const triggerUi = async (params: TriggerUiParams) => {
    const tabs = await window.browser.tabs.query({ active: true })

    const currentlyActiveNekotonTab = Boolean(
        tabs.find((tab) => tab.id != null && openNekotonTabsIDs[tab.id])
    )

    if (!uiIsTriggering && (params.force || !popupIsOpen) && !currentlyActiveNekotonTab) {
        uiIsTriggering = true
        try {
            await windowManager.showPopup({
                group: params.group,
                width: params.width,
                height: params.height,
            })
        } finally {
            uiIsTriggering = false
        }
    }
}

const ensureInitialized = initialize().catch(console.error)

window.browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install' && !(process.env.NEKOTON_DEBUG || process.env.IN_TEST)) {
        ensureInitialized.then(() => openExtensionInBrowser()).catch(console.error)
    }
})
