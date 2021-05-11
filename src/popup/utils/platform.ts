import { checkForError } from '@shared/utils'
import { memoize } from 'lodash'
import {
    Environment,
    ENVIRONMENT_TYPE_BACKGROUND,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_POPUP,
    ENVIRONMENT_TYPE_FULLSCREEN,
} from '@shared/constants'

const NOTIFICATION_HEIGHT = 620
const NOTIFICATION_WIDTH = 400

export const focusTab = (tabId: number): Promise<chrome.tabs.Tab | undefined> => {
    return new Promise<chrome.tabs.Tab | undefined>((resolve, reject) => {
        chrome.tabs.update(+tabId, { active: true }, (tab) => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve(tab)
            }
        })
    })
}

export const focusWindow = (id: number): Promise<chrome.windows.Window> => {
    return new Promise<chrome.windows.Window>((resolve, reject) => {
        chrome.windows.update(id, { focused: true }, (window) => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve(window)
            }
        })
    })
}

export const getLastFocused = (): Promise<chrome.windows.Window> => {
    return new Promise<chrome.windows.Window>((resolve, reject) => {
        chrome.windows.getLastFocused((window) => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve(window)
            }
        })
    })
}

export const getAllWindows = (): Promise<chrome.windows.Window[]> => {
    return new Promise<chrome.windows.Window[]>((resolve, reject) => {
        chrome.windows.getAll((windows) => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve(windows)
            }
        })
    })
}

export const openWindow = (
    options: chrome.windows.CreateData
): Promise<chrome.windows.Window | undefined> => {
    return new Promise<chrome.windows.Window | undefined>((resolve, reject) => {
        chrome.windows.create(options, (window) => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve(window)
            }
        })
    })
}

export const updateWindowPosition = (id: number, left: number, top: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        chrome.windows.update(id, { left, top }, () => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve()
            }
        })
    })
}

export const openExtensionInBrowser = async (route?: string, query?: string) => {
    let extensionUrl = chrome.runtime.getURL('home.html')
    if (query) {
        extensionUrl += `?${query}`
    }
    if (route) {
        extensionUrl += `#${route}`
    }

    await new Promise<chrome.tabs.Tab>((resolve, reject) => {
        chrome.tabs.create({ url: extensionUrl }, (newTab) => {
            const error = checkForError()
            if (error != null) {
                reject(error)
            } else {
                resolve(newTab)
            }
        })
    })
}

const getEnvironmentTypeCached = memoize(
    (url): Environment => {
        const parseUrl = new URL(url)
        if (parseUrl.pathname === '/popup.html') {
            return ENVIRONMENT_TYPE_POPUP
        } else if (parseUrl.pathname === '/notification.html') {
            return ENVIRONMENT_TYPE_NOTIFICATION
        } else if (parseUrl.pathname === '/home.html') {
            return ENVIRONMENT_TYPE_FULLSCREEN
        }
        return ENVIRONMENT_TYPE_BACKGROUND
    }
)

export const getEnvironmentType = (url = window.location.href) => getEnvironmentTypeCached(url)

export class NotificationManager {
    private _popupId?: number

    constructor() {}

    async showPopup() {
        const popup = await this._getPopup()

        if (popup) {
            await focusWindow(popup.id)
            return
        } else {
            let left = 0
            let top = 0
            try {
                const lastFocused = await getLastFocused()
                top = lastFocused.top || top
                left = (lastFocused.left || left) + ((lastFocused.width || 0) - NOTIFICATION_WIDTH)
            } catch (_) {
                const { screenX, screenY, outerWidth } = window
                top = Math.max(screenY, 0)
                left = Math.max(screenX + (outerWidth - NOTIFICATION_WIDTH), 0)
            }

            const popupWindow = await openWindow({
                url: 'notification.html',
                type: 'popup',
                width: NOTIFICATION_WIDTH,
                height: NOTIFICATION_HEIGHT,
                left,
                top,
            })

            if (popupWindow == null) {
                throw Error('NotificationManager: Failed to create popup window')
            }

            if (popupWindow.left !== left && popupWindow.state !== 'fullscreen') {
                await updateWindowPosition(popupWindow.id, left, top)
            }
            this._popupId = popupWindow.id
        }
    }

    private async _getPopup() {
        const windows = await getAllWindows()
        return this._getPopupIn(windows)
    }

    private _getPopupIn(windows: chrome.windows.Window[]) {
        return windows.find((window) => {
            return window.type === 'popup' && window.id === this._popupId
        })
    }
}
