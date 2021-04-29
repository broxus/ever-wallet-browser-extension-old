import { checkForError } from '@shared/utils'

const NOTIFICATION_HEIGHT = 600
const NOTIFICATION_WIDTH = 360

const focusWindow = (id: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        chrome.windows.update(id, { focused: true }, () => {
            const error = checkForError()
            if (error) {
                reject(error)
            } else {
                resolve()
            }
        })
    })
}

const getLastFocused = (): Promise<chrome.windows.Window> => {
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

const getAllWindows = (): Promise<chrome.windows.Window[]> => {
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

const openWindow = (
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

const updateWindowPosition = (id: number, left: number, top: number): Promise<void> => {
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

export class NotificationManager {
    private _popupId?: number

    constructor() {}

    async showPopup() {
        const popup = await this._getPopup()

        if (popup) {
            return await focusWindow(popup.id)
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
