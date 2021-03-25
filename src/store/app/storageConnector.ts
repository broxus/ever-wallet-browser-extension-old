import { StorageQueryHandler, StorageQueryResultHandler } from '../../../nekoton/pkg'

export class StorageConnector {
    get(key: string, handler: StorageQueryResultHandler) {
        chrome.storage.sync.get(key, (items) => {
            handler.onResult(items[key])
        })
    }

    set(key: string, value: string, handler: StorageQueryHandler) {
        chrome.storage.sync.set({ [key]: value }, () => {
            handler.onResult()
        })
    }

    setUnchecked(key: string, value: string) {
        chrome.storage.sync.set({ [key]: value }, () => {})
    }

    remove(key: string, handler: StorageQueryHandler) {
        chrome.storage.sync.set({ [key]: undefined }, () => {
            handler.onResult()
        })
    }

    removeUnchecked(key: string) {
        chrome.storage.sync.set({ [key]: undefined }, () => {})
    }
}
