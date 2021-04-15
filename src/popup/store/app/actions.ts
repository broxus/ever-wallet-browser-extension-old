import { AppDispatch } from '../index'
import { GqlSocket, StorageConnector } from '../../../background/common'
import { MessageToPrepare } from './types'
import Decimal from 'decimal.js'
import * as nt from '../../../../nekoton/pkg'

Decimal.set({ maxE: 500, minE: -500 })

export const ActionTypes = {
    SETLOCALE: 'app/set-locale',
    SET_ACCOUNT_LOADED: 'SET_ACCOUNT_LOADED',

    ADD_KEY_SUCCESS: 'ADD_KEY_SUCCESS',
    ADD_KEY_FAILURE: 'ADD_KEY_FAILURE',
    RESTORE_ACCOUNT_SUCCESS: 'RESTORE_ACCOUNT_SUCCESS',
    RESTORE_ACCOUNT_FAILURE: 'RESTORE_ACCOUNT_FAILURE',
    SET_CURRENT_ACCOUNT_SUCCESS: 'SET_CURRENT_ACCOUNT_SUCCESS',
    SET_CURRENT_ACCOUNT_FAILURE: 'SET_CURRENT_ACCOUNT_FAILURE',
    SET_TON_WALLET_STATE: 'SET_TON_WALLET_STATE',
    ADD_NEW_TRANSACTIONS: 'ADD_NEW_TRANSACTIONS',
    SET_FEE_CALCULATION_SUCCESS: 'SET_FEE_CALCULATION_SUCCESS',
    SET_FEE_CALCULATION_FAILURE: 'SET_FEE_CALCULATION_FAILURE',
    RESET_ACCOUNTS: 'RESET_ACCOUNTS',
}

let __storage: nt.Storage | null = null
const loadStorage = () => {
    if (__storage == null) {
        __storage = new nt.Storage(new StorageConnector())
    }
    return __storage
}

let __accountsStorage: nt.AccountsStorage | null = null
const loadAccountsStorage = async () => {
    if (__accountsStorage == null) {
        __accountsStorage = await nt.AccountsStorage.load(loadStorage())
    }
    return __accountsStorage
}

let __keystore: nt.KeyStore | null = null
const loadKeyStore = async () => {
    if (__keystore == null) {
        __keystore = await nt.KeyStore.load(loadStorage())
    }
    return __keystore
}

type ConnectionState = {
    socket: GqlSocket
    connection: nt.GqlConnection
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

const __subscriptions = new Map<string, nt.TonWallet>()
const loadSubscription = async (
    publicKey: string,
    contractType: nt.ContractType,
    dispatch: AppDispatch
): Promise<nt.TonWallet> => {
    const address = nt.computeTonWalletAddress(publicKey, contractType, 0)

    let subscription = __subscriptions.get(address)
    if (subscription == null) {
        const ctx = await loadConnection()
        subscription = await ctx.connection.subscribeToTonWallet(
            publicKey,
            contractType,
            new TonWalletHandler(dispatch, address)
        )
        if (subscription == null) {
            throw Error('Failed to subscribe')
        }

        const POLLING_INTERVAL = 10000 // 10s

        ;(async () => {
            let currentBlockId: string | null = null
            let lastPollingMethod = subscription.pollingMethod
            for (let i = 0; i < 10; ++i) {
                switch (lastPollingMethod) {
                    case 'manual': {
                        await new Promise<void>((resolve) => {
                            setTimeout(() => resolve(), POLLING_INTERVAL)
                        })
                        console.log('manual refresh')
                        await subscription.refresh()
                        break
                    }
                    case 'reliable': {
                        if (lastPollingMethod != 'reliable' || currentBlockId == null) {
                            currentBlockId = (await subscription.getLatestBlock()).id
                        }

                        const nextBlockId: string = await subscription.waitForNextBlock(
                            currentBlockId,
                            60
                        )
                        console.log(nextBlockId, currentBlockId != nextBlockId)

                        await subscription.handleBlock(nextBlockId)
                        currentBlockId = nextBlockId
                        break
                    }
                }

                lastPollingMethod = subscription.pollingMethod
            }
        })().then((_) => {})
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
    const accounts = await accountsStorage.getStoredAccounts()

    if (accounts.length === 0) {
        dispatch({
            type: ActionTypes.SET_ACCOUNT_LOADED,
            payload: { loaded: false },
        })
    } else {
        const currentAccount = await accountsStorage.getCurrentAccount()
        console.log('currentAccount', currentAccount)
        dispatch({
            type: ActionTypes.SET_ACCOUNT_LOADED,
            payload: { loaded: true, currentAccount },
        })
    }
}

export const resetAccounts = () => async (dispatch: AppDispatch) => {
    const accountsStorage = await loadAccountsStorage()

    try {
        await accountsStorage.clear()
        console.log('cleared successfully')
        dispatch({
            type: ActionTypes.RESET_ACCOUNTS,
        })
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

// export const getCurrentAccount = (publicKey: string) => async (dispatch: AppDispatch) => {
//     try {
//         const accountsStorage = await loadAccountsStorage()
//
//         console.log('accountsStorage', accountsStorage)
//         const address = await accountsStorage.addAccount('Account 1', publicKey, 'SurfWallet', true)
//         console.log('address', address)
//         const currentAccount = await accountsStorage.getCurrentAccount()
//         console.log('currentAccount', currentAccount)
//         dispatch({
//             type: ActionTypes.SET_CURRENT_ACCOUNT_SUCCESS,
//             payload: address,
//         })
//     } catch (error) {
//         console.log(error)
//         dispatch({
//             type: ActionTypes.SET_CURRENT_ACCOUNT_FAILURE,
//         })
//     }
// }

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
    console.log('accountsStorage', accountsStorage)

    const address = await accountsStorage.addAccount(accountName, key.publicKey, contractType, true)
    console.log('address', address)
    dispatch({
        type: ActionTypes.SET_CURRENT_ACCOUNT_SUCCESS,
        payload: address,
    })
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
            dispatch
        )
    } catch (e) {
        console.log(e)
    }
}

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

        const tonWallet = await loadSubscription(
            account.tonWallet.publicKey,
            account.tonWallet.contractType,
            dispatch
        )

        const contractState = await tonWallet.getContractState()
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

        console.log(amount.ceil())

        const unsignedMessage = tonWallet.prepareTransfer(
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
        const totalFees = await tonWallet.estimateFees(signedMessage)

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
