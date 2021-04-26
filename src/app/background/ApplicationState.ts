import { EventEmitter } from 'events'
import * as nt from '@nekoton'

interface ApplicationStateOptions {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
}

export class ApplicationState extends EventEmitter {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore

    selectedAccount: nt.AssetsList | null = null
    tonWalletStates: Map<string, nt.AccountState> = new Map<string, nt.AccountState>()

    constructor({ storage, accountsStorage, keyStore }: ApplicationStateOptions) {
        super()
        this.storage = storage
        this.accountsStorage = accountsStorage
        this.keyStore = keyStore
    }
}
