import * as nt from '@nekoton'

export const ACCOUNTS_STORAGE_KEY = nt.accountsStorageKey()
export const KEYSTORE_STORAGE_KEY = nt.keystoreStorageKey()

export class StorageConnector {
    get(key: string, handler: nt.StorageQueryResultHandler) {
        window.browser.storage.local
            .get(key)
            .then((items) => {
                handler.onResult(items[key])
            })
            .catch((e) => handler.onError(e))
    }

    set(key: string, value: string, handler: nt.StorageQueryHandler) {
        window.browser.storage.local
            .set({ [key]: value })
            .then(() => {
                handler.onResult()
            })
            .catch((e) => handler.onError(e))
    }

    setUnchecked(key: string, value: string) {
        window.browser.storage.local.set({ [key]: value }).catch(console.error)
    }

    remove(key: string, handler: nt.StorageQueryHandler) {
        window.browser.storage.local
            .remove([key])
            .then(() => {
                handler.onResult()
            })
            .catch((e) => handler.onError(e))
    }

    removeUnchecked(key: string) {
        window.browser.storage.local.remove([key]).catch(console.error)
    }
}
