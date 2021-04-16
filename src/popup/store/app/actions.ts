import { AppDispatch } from '../index'
import { Locale, MessageToPrepare, AppState } from './types'
import { loadKeyStore, loadSubscription, loadAccountsStorage, ITonWalletHandler } from './services'

import * as nt from '@nekoton'
import { mergeTransactions } from '../../../background/common'
import { parseTons } from '@utils'

export const Action = {
    setLocale: (locale: Locale) => (draft: AppState) => {
        draft.locale = locale
    },
    setCurrentAccount: (account: nt.AssetsList) => (draft: AppState) => {
        draft.selectedAccount = account
    },
    resetAccounts: () => (draft: AppState) => {
        draft.selectedAccount = null
        draft.tonWalletState = null
        draft.transactions = []
    },
    setTonWalletState: (_address: string, state: nt.AccountState) => (draft: AppState) => {
        draft.tonWalletState = state
    },
    addNewTransactions: (
        _address: string,
        newTransactions: nt.Transaction[],
        info: nt.TransactionsBatchInfo
    ) => (draft: AppState) => {
        mergeTransactions(draft.transactions, newTransactions, info)
    },
}

export const ActionTypes: { [K in keyof typeof Action]: K } = window.ObjectExt.keys(Action).reduce(
    (state, key) => ({ ...state, [key]: key }),
    {} as any
)

// Helper function to infer parameter types
function updateStore<K extends keyof typeof Action, F extends typeof Action[K]>(
    dispatch: AppDispatch,
    type: K,
    ...args: Parameters<F>
) {
    dispatch({
        type,
        // @ts-ignore
        payload: [...args],
    })
}

export const setLocale = (locale: Locale) => async (dispatch: AppDispatch) => {
    updateStore(dispatch, ActionTypes.setLocale, locale)
}

export const setupCurrentAccount = () => async (dispatch: AppDispatch) => {
    const accountsStorage = await loadAccountsStorage()

    const currentAccount = await accountsStorage.getCurrentAccount()
    if (currentAccount == null) {
        return
    }

    const account = await accountsStorage.getAccount(currentAccount)
    if (account != null) {
        updateStore(dispatch, ActionTypes.setCurrentAccount, account)
    }
}

export const logOut = () => async (dispatch: AppDispatch) => {
    const accountsStorage = await loadAccountsStorage()
    const keyStore = await loadKeyStore()

    try {
        await accountsStorage.clear()
        await keyStore.clear()

        console.log('cleared successfully')
        updateStore(dispatch, ActionTypes.resetAccounts)
    } catch (e) {
        console.log(e, 'clearing failed')
    }
}

export const generateSeed = () => {
    return nt.generateMnemonic(nt.makeLabsMnemonic(0))
}

export const validateMnemonic = (phrase: string, mnemonicType: nt.MnemonicType) => {
    nt.validateMnemonic(phrase, mnemonicType)
}

export const exportKey = async (params: nt.ExportKey): Promise<nt.ExportedKey> => {
    const keyStore = await loadKeyStore()
    return await keyStore.exportKey(params)
}

export const createAccount = (
    accountName: string,
    contractType: nt.ContractType,
    seed: nt.GeneratedMnemonic,
    password: string
) => async (dispatch: AppDispatch) => {
    const keystore = await loadKeyStore()

    const key = await keystore.addKey(`${accountName} key`, <nt.NewKey>{
        type: 'encrypted_key',
        data: {
            password,
            phrase: seed.phrase,
            mnemonicType: seed.mnemonicType,
        },
    })

    const accountsStorage = await loadAccountsStorage()
    const address = await accountsStorage.addAccount(accountName, key.publicKey, contractType, true)
    const account = await accountsStorage.getAccount(address)
    if (account == null) {
        throw Error('Failed to create account')
    }

    updateStore(dispatch, ActionTypes.setCurrentAccount, account)
}

const makeSubscriptionHandler = (dispatch: AppDispatch) => (address: string) => {
    class TonWalletHandler implements ITonWalletHandler {
        constructor(private dispatch: AppDispatch, private address: string) {}

        onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
            console.log(pendingTransaction, transaction)
        }

        onMessageExpired(pendingTransaction: nt.PendingTransaction) {
            console.log(pendingTransaction)
        }

        onStateChanged(newState: nt.AccountState) {
            updateStore(this.dispatch, ActionTypes.setTonWalletState, this.address, newState)
        }

        onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo) {
            updateStore(
                this.dispatch,
                ActionTypes.addNewTransactions,
                this.address,
                transactions,
                info
            )
        }
    }

    return new TonWalletHandler(dispatch, address)
}

export const startSubscription = (address: string) => async (dispatch: AppDispatch) => {
    try {
        // ключи - адреса, значения - assets list
        const accountsStorage = await loadAccountsStorage()

        const account = await accountsStorage.getAccount(address)
        console.log('account', account)

        if (account == null) {
            throw new Error("Selected account doesn't exist")
        }

        await loadSubscription(
            account.tonWallet.publicKey,
            account.tonWallet.contractType,
            makeSubscriptionHandler(dispatch)
        )
    } catch (e) {
        console.log(e)
    }
}

export const prepareMessage = (address: string, messageToPrepare: MessageToPrepare) => async (
    dispatch: AppDispatch
) => {
    const accountsStorage = await loadAccountsStorage()
    const account = await accountsStorage.getAccount(address)
    if (account == null) {
        throw new Error("Selected account doesn't exist")
    }

    const tonWallet = await loadSubscription(
        account.tonWallet.publicKey,
        account.tonWallet.contractType,
        makeSubscriptionHandler(dispatch)
    )

    const contractState = await tonWallet.getContractState()
    if (contractState == null) {
        throw new Error('Contract state is empty')
    }

    const amount = parseTons(messageToPrepare.amount)
    const bounce = false
    const expireAt = 60 // seconds

    const unsignedMessage = tonWallet.prepareTransfer(
        contractState,
        messageToPrepare.recipient,
        amount,
        bounce,
        expireAt
    )
    if (unsignedMessage == null) {
        // TODO: show notification with deployment
        throw new Error('Contract must be deployed first')
    }
    return unsignedMessage
}

export const estimateFees = (address: string, message: nt.SignedMessage) => async (
    dispatch: AppDispatch
) => {
    const accountsStorage = await loadAccountsStorage()
    const account = await accountsStorage.getAccount(address)
    if (account == null) {
        throw new Error("Selected account doesn't exist")
    }

    const tonWallet = await loadSubscription(
        account.tonWallet.publicKey,
        account.tonWallet.contractType,
        makeSubscriptionHandler(dispatch)
    )

    return await tonWallet.estimateFees(message)
}

export const sendMessage = (
    address: string,
    message: nt.UnsignedMessage,
    password: string
) => async (dispatch: AppDispatch) => {
    const accountsStorage = await loadAccountsStorage()

    const account = await accountsStorage.getAccount(address)
    if (account == null) {
        throw new Error("Selected account doesn't exist")
    }

    const keyStore = await loadKeyStore()

    console.log(`Entries: ${JSON.stringify(await keyStore.getKeys())}`)
    console.log(`Signing with public key: ${account.tonWallet.publicKey}`)

    const signedMessage = await keyStore.sign(message, {
        type: 'encrypted_key',
        data: {
            publicKey: account.tonWallet.publicKey,
            password,
        },
    })

    const tonWallet = await loadSubscription(
        account.tonWallet.publicKey,
        account.tonWallet.contractType,
        makeSubscriptionHandler(dispatch)
    )

    return await tonWallet.sendMessage(signedMessage)
}
