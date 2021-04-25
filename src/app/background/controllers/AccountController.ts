import { EventEmitter } from 'events'
import * as nt from '@nekoton'

interface ApplicationStateOptions {
    storage: nt.Storage
    accountsStorage: nt.AccountsStorage
    keyStore: nt.KeyStore
}

export interface ITonWalletHandler {
    onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction): void

    onMessageExpired(pendingTransaction: nt.PendingTransaction): void

    onStateChanged(newState: nt.AccountState): void

    onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo): void
}

export class AccountController extends EventEmitter {
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

    public async initialSync() {
        const currentAccount = await this.accountsStorage.getCurrentAccount()
    }
}
