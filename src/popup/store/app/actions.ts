import init, {
    AccountsStorage,
    AccountType,
    GeneratedMnemonic,
    KeyStore,
    Storage,
    StoredKey,
} from '../../../../nekoton/pkg'
import { AppDispatch } from '../index'
import { StorageConnector } from './storageConnector'

export const ActionTypes = {
    SETLOCALE: 'app/set-locale',
    GENERATE_SEED_SUCCESS: 'GENERATE_SEED_SUCCESS',
    GENERATE_KEY_SUCCESS: 'GENERATE_KEY_SUCCESS',
    ADD_KEY_SUCCESS: 'ADD_KEY_SUCCESS',
    ADD_KEY_FAILURE: 'ADD_KEY_FAILURE',
    RESTORE_KEY_SUCCESS: 'RESTORE_KEY_SUCCESS',
    RESTORE_KEY_FAILURE: 'RESTORE_KEY_FAILURE',
    SET_CURRENT_ACCOUNT_SUCCESS: 'SET_CURRENT_ACCOUNT_SUCCESS',
    SET_CURRENT_ACCOUNT_FAILURE: 'SET_CURRENT_ACCOUNT_FAILURE',
}

export const setLocale = (locale: any) => async (
    dispatch: (arg0: { type: string; payload: any }) => void
) => {
    dispatch({
        type: ActionTypes.SETLOCALE,
        payload: locale,
    })
}

export const generateSeedPhrase = () => async (dispatch: AppDispatch) => {
    const phrase = StoredKey.generateMnemonic(AccountType.makeLabs(0))
    console.log('phrase', phrase)
    dispatch({
        type: ActionTypes.GENERATE_SEED_SUCCESS,
        payload: phrase,
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
    const storage = new Storage(new StorageConnector())
    const keyStore = await KeyStore.load(storage)
    try {
        await keyStore.addKey(key)
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
    const storage = new Storage(new StorageConnector())
    const keyStore = await KeyStore.load(storage)
    try {
        const restoredKey = await keyStore.getKey(publicKey)
        dispatch({
            type: ActionTypes.RESTORE_KEY_SUCCESS,
            payload: restoredKey,
        })
        console.log(keyStore.storedKeys, 'storedKeys')
    } catch {
        dispatch({
            type: ActionTypes.RESTORE_KEY_FAILURE,
        })
    }
}

export const getCurrentAccount = (publicKey: string) => async (dispatch: AppDispatch, getState) => {
    const storage = new Storage(new StorageConnector())
    try {
        const accountsStorage = await AccountsStorage.load(storage)
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
