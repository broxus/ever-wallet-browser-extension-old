import init, {
    AccountsStorage,
    AccountType,
    GeneratedMnemonic,
    GqlConnection,
    KeyStore,
    Storage,
    StoredKey,
    TonWallet,
    TonWalletSubscription,
} from '../../../../nekoton/pkg'
import { AppDispatch } from '../index'
import { GqlSocket, mergeTransactions, StorageConnector } from '../../../background/common'
import { MessageToPrepare } from './types'
import Decimal from 'decimal.js'

Decimal.set({ maxE: 500, minE: -500 })

import * as nt from '../../../../nekoton/pkg'

export const ActionTypes = {
    SETLOCALE: 'app/set-locale',
    SET_ACCOUNT_LOADED: 'SET_ACCOUNT_LOADED',
    GENERATE_SEED_SUCCESS: 'GENERATE_SEED_SUCCESS',
    GENERATE_KEY_SUCCESS: 'GENERATE_KEY_SUCCESS',
    SET_WALLET_TYPE: 'SET_WALLET_TYPE',
    ADD_KEY_SUCCESS: 'ADD_KEY_SUCCESS',
    ADD_KEY_FAILURE: 'ADD_KEY_FAILURE',
    RESTORE_KEY_SUCCESS: 'RESTORE_KEY_SUCCESS',
    RESTORE_KEY_FAILURE: 'RESTORE_KEY_FAILURE',
    SET_CURRENT_ACCOUNT_SUCCESS: 'SET_CURRENT_ACCOUNT_SUCCESS',
    SET_CURRENT_ACCOUNT_FAILURE: 'SET_CURRENT_ACCOUNT_FAILURE',
    SET_TON_WALLET_STATE: 'SET_TON_WALLET_STATE',
    ADD_NEW_TRANSACTIONS: 'ADD_NEW_TRANSACTIONS',
    SET_FEE_CALCULATION_SUCCESS: 'SET_FEE_CALCULATION_SUCCESS',
    SET_FEE_CALCULATION_FAILURE: 'SET_FEE_CALCULATION_FAILURE',
    SET_PASSWORD: 'SET_PASSWORD',
}

let __storage: Storage | null = null
const loadStorage = () => {
    if (__storage == null) {
        __storage = new Storage(new StorageConnector())
    }
    return __storage
}

let __accountsStorage: AccountsStorage | null = null
const loadAccountsStorage = async () => {
    if (__accountsStorage == null) {
        __accountsStorage = await AccountsStorage.load(loadStorage())
    }
    return __accountsStorage
}

let __keystore: KeyStore | null = null
const loadKeyStore = async () => {
    if (__keystore == null) {
        __keystore = await KeyStore.load(loadStorage())
    }
    return __keystore
}

type ConnectionState = {
    socket: GqlSocket
    connection: GqlConnection
}

let __connection: ConnectionState | null = null
const loadConnection = async () => {
    if (__connection == null) {
        const socket = new GqlSocket()
        const connection = await socket.connect({
            endpoint: 'https://main.ton.dev/graphql',
            timeout: 60000, // 60s
        })

        __connection = <ConnectionState>{
            socket,
            connection,
        }
    }
    return __connection
}

class TonWalletHandler {
    constructor(private dispatch: AppDispatch, private address: string) {}

    onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction) {
        console.log(pendingTransaction, transaction)
    }

    onMessageExpired(pendingTransaction: nt.PendingTransaction) {
        console.log(pendingTransaction)
    }

    onStateChanged(newState: nt.AccountState) {
        this.dispatch({
            type: ActionTypes.SET_TON_WALLET_STATE,
            payload: { newState, address: this.address },
        })
        console.log(newState)
    }

    onTransactionsFound(transactions: Array<nt.Transaction>, info: nt.TransactionsBatchInfo) {
        this.dispatch({
            type: ActionTypes.ADD_NEW_TRANSACTIONS,
            payload: {
                transactions,
                info,
                address: this.address,
            },
        })
    }
}

const __subscriptions = new Map<string, TonWalletSubscription>()
const loadSubscription = async (address: string, dispatch: AppDispatch) => {
    let subscription = __subscriptions.get(address)
    if (subscription == null) {
        const ctx = await loadConnection()
        subscription = await ctx.connection.subscribeToTonWallet(
            address,
            new TonWalletHandler(dispatch, address)
        )
    }
    return subscription
}

export const setLocale = (locale: any) => async (
    dispatch: (arg0: { type: string; payload: any }) => void
) => {
    dispatch({
        type: ActionTypes.SETLOCALE,
        payload: locale,
    })
}

export const checkAccounts = () => async (dispatch: AppDispatch) => {
    const accountsStorage = await loadAccountsStorage()
    console.log(accountsStorage, 'accountsStorage')
    const accounts = await accountsStorage.getStoredAccounts()
    console.log(accounts, 'accounts')

    if (accounts.length === 0) {
        dispatch({
            type: ActionTypes.SET_ACCOUNT_LOADED,
            payload: false,
        })
    } else {
        const currentAccount = await accountsStorage.getCurrentAccount()
        console.log('currentAccount', currentAccount)
        dispatch({
            type: ActionTypes.SET_ACCOUNT_LOADED,
            payload: true,
        })
        //
        // dispatch({
        //     type: ActionTypes.SET_CURRENT_ACCOUNT_SUCCESS,
        //     payload: address,
        // })
    }
}

export const resetAccounts = () => async (dispatch: AppDispatch) => {
    const accountsStorage = await loadAccountsStorage()
    console.log(accountsStorage, 'accountsStorage')
    const clear = await accountsStorage.clear()
    console.log(clear, 'clear')
    const accounts = await accountsStorage.getStoredAccounts()
    console.log(accounts, 'accounts')
}

export const generateSeedPhrase = () => async (dispatch: AppDispatch) => {
    const phrase = StoredKey.generateMnemonic(AccountType.makeLabs(0))
    console.log('phrase', phrase)
    dispatch({
        type: ActionTypes.GENERATE_SEED_SUCCESS,
        payload: phrase,
    })
}

export const setWalletType = (type: string) => (dispatch: AppDispatch) => {
    dispatch({
        type: ActionTypes.SET_WALLET_TYPE,
        payload: type,
    })
}
export const setPassword = (pwd: string) => (dispatch: AppDispatch) => {
    dispatch({
        type: ActionTypes.SET_PASSWORD,
        payload: pwd,
    })
}

export const createKey = (phrase: GeneratedMnemonic, password: string) => async (
    dispatch: AppDispatch
) => {
    const key = phrase.createKey('Main key', password)
    console.log('created key', key)
    dispatch({
        type: ActionTypes.GENERATE_KEY_SUCCESS,
        payload: key,
    })
}

export const addKey = (key: StoredKey) => async (dispatch: AppDispatch) => {
    try {
        await loadKeyStore().then((keystore) => keystore.addKey(key))
        dispatch({
            type: ActionTypes.ADD_KEY_SUCCESS,
        })
    } catch {
        dispatch({
            type: ActionTypes.ADD_KEY_FAILURE,
        })
    }
}

export const restoreKey = (publicKey: any) => async (dispatch: AppDispatch) => {
    try {
        const restoredKey = await loadKeyStore().then((keystore) => keystore.getKey(publicKey))
        dispatch({
            type: ActionTypes.RESTORE_KEY_SUCCESS,
            payload: restoredKey,
        })
    } catch {
        dispatch({
            type: ActionTypes.RESTORE_KEY_FAILURE,
        })
    }
}

export const getCurrentAccount = (publicKey: string) => async (dispatch: AppDispatch) => {
    try {
        const accountsStorage = await loadAccountsStorage()

        console.log('accountsStorage', accountsStorage)
        const address = await accountsStorage.addAccount('Account 1', publicKey, 'SurfWallet', true)
        console.log('address', address)
        const currentAccount = await accountsStorage.getCurrentAccount()
        console.log('currentAccount', currentAccount)
        dispatch({
            type: ActionTypes.SET_CURRENT_ACCOUNT_SUCCESS,
            payload: address,
        })
    } catch (error) {
        console.log(error)
        dispatch({
            type: ActionTypes.SET_CURRENT_ACCOUNT_FAILURE,
        })
    }
}

// export const createAccount = (name, publicKey, contractType)

export const calculateFee = (address: string, messageToPrepare: MessageToPrepare) => async (
    dispatch: AppDispatch
) => {
    try {
        // ключи - адреса, значения - assets list
        const accountsStorage = await loadAccountsStorage()

        const account = await accountsStorage.getAccount(address)
        if (account == null) {
            throw new Error("Selected account doesn't exist")
        }

        const subscription = await loadSubscription(address, dispatch)

        const contractState = await subscription.getContractState()
        if (contractState == null) {
            throw new Error('Contract state is empty')
        }

        // при старте приложения, тут получаем адрес
        const myAcc = await accountsStorage.getCurrentAccount()

        //сменить аккаунт
        const newAcc = await accountsStorage.setCurrentAccount('address')

        // создаем аккаунт, и на него сразу можно переключиться
        // const acc = await accountsStorage.addAccount()

        const amount = new Decimal(messageToPrepare.amount).mul('1000000000') // TODO: get multiplier from precision table
        const bounce = false
        const expireAt = new Date().getTime() + 60 // expire in 60 seconds

        const wallet = new TonWallet(account.tonWallet.publicKey, account.tonWallet.contractType)

        console.log(amount.ceil())

        const unsignedMessage = wallet.prepareTransfer(
            contractState,
            messageToPrepare.recipient,
            amount.ceil().toFixed(0),
            bounce,
            expireAt
        )
        if (unsignedMessage == null) {
            // TODO: show notification with deployment
            throw new Error('Contract must be deployed first')
        }

        const signedMessage = unsignedMessage.signFake()
        const totalFees = await subscription.estimateFees(signedMessage)

        console.log('Calculated fees:', totalFees)

        dispatch({
            type: ActionTypes.SET_FEE_CALCULATION_SUCCESS,
            payload: totalFees,
        })
    } catch (error) {
        console.log(error)
        dispatch({
            type: ActionTypes.SET_FEE_CALCULATION_FAILURE,
        })
    }
}

// ;(async () => {
//     await init('index_bg.wasm')
//
//     const phrase = StoredKey.generateMnemonic(AccountType.makeLabs(0))
//     console.log(phrase.phrase, phrase.accountType)
//     //
//     const key = phrase.createKey('Main key', 'test') // `phrase` moved here
//     console.log(key, 'key')
//     // Can't use `phrase` here
//
//     const publicKey = key.publicKey
//
//     const storage = new Storage(new StorageConnector())
//     const keyStore = await KeyStore.load(storage)
//
//     await keyStore.addKey(key)
//     console.log('Added key to keystore')
//
//     const restoredKey = await keyStore.getKey(publicKey)
//     console.log('Restored key:', restoredKey)
//
//     console.log(keyStore.storedKeys)
// })()
