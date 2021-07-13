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

export const getCurrentWindow = (): Promise<chrome.windows.Window> => {
    return new Promise<chrome.windows.Window>((resolve, reject) => {
        chrome.windows.getCurrent((windowDetails) => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve(windowDetails)
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

interface ShowPopupParams {
    group: string
    width?: number
    height?: number
}

export class WindowManager {
    private _groups: { [group: string]: number } = {}
    private _popups: { [popup: number]: string } = {}

    constructor() {}

    public getGroup(windowId: number): string | undefined {
        return this._popups[windowId] as string | undefined
    }

    public async showPopup(params: ShowPopupParams) {
        const popup = await this._getPopup(params.group)

        if (popup != null) {
            await focusWindow(popup.id)
            return
        } else {
            let left = 0
            let top = 0
            const width = params.width || NOTIFICATION_WIDTH
            const height = params.height || NOTIFICATION_HEIGHT

            try {
                const lastFocused = await getLastFocused()
                top = (lastFocused.top || top) + ((lastFocused.top || 0) - height) / 2
                left = (lastFocused.left || left) + ((lastFocused.width || 0) - width) / 2
            } catch (_) {
                const { screenX, screenY, outerWidth } = window
                top = Math.max(screenY, 0)
                left = Math.max(screenX + (outerWidth - width), 0)
            }

            const popupWindow = await openWindow({
                url: 'notification.html',
                type: 'popup',
                width,
                height,
                left,
                top,
            })

            if (popupWindow == null) {
                throw Error('NotificationManager: Failed to create popup window')
            }

            if (popupWindow.left !== left && popupWindow.state !== 'fullscreen') {
                await updateWindowPosition(popupWindow.id, left, top)
            }

            this._groups[params.group] = popupWindow.id
            this._popups[popupWindow.id] = params.group
        }
    }

    private async _getPopup(group: string) {
        const popupId = this._groups[group] as number | undefined
        let result: chrome.windows.Window | undefined = undefined

        let newGroups: { [group: string]: number } = {}
        let newPopups: { [popup: number]: string } = {}

        const windows = await getAllWindows()
        for (const window of windows) {
            if (window.type !== 'popup') {
                continue
            }

            const existingGroup = this._popups[window.id] as string | undefined
            if (existingGroup != null) {
                newGroups[existingGroup] = window.id
                newPopups[window.id] = existingGroup
            }

            if (window.id === popupId) {
                result = window
            }
        }

        this._groups = newGroups
        this._popups = newPopups

        return result
    }
}
