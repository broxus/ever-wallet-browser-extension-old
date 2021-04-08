import { produce } from 'immer'
import { ActionTypes } from './actions'
import { Action, AppState } from './types'
import * as nt from '../../../../nekoton/pkg'
import { AccountState, Transaction } from '../../../../nekoton/pkg'
import { mergeTransactions } from '../../../background/common'

export const initialState = Object.freeze<AppState>({
    // @ts-ignore
    accountType: null,
    locale: 'en_US',
    seed: '',
    walletType: '',
    pwd: '',
    phrase: {},
    createdKey: '',
    publicKey: '',
    account: '',
    tonWalletState: null,
    transactions: new Array<Transaction>(),
    currentFee: '',
})

class Wrapper {
    constructor(public data: nt.AccountType) {
        Wrapper.stored = data
    }

    static stored: nt.AccountType
}

// @ts-ignore
export default (state: AppState = initialState, action: Action): AppState =>
    produce(state, (draft: AppState) => {
        switch (action.type) {
            case ActionTypes.SETLOCALE: {
                draft.locale = action.payload
                return
            }
            case ActionTypes.GENERATE_SEED_SUCCESS: {
                draft.seed = action.payload.phrase.split(' ')
                draft.phrase = action.payload
                return
            }
            case ActionTypes.SET_WALLET_TYPE: {
                draft.walletType = action.payload
                return
            }
            case ActionTypes.SET_PASSWORD: {
                draft.pwd = action.payload
                return
            }
            case ActionTypes.GENERATE_KEY_SUCCESS: {
                draft.createdKey = action.payload
                draft.publicKey = action.payload.publicKey
                return
            }
            case ActionTypes.ADD_KEY_SUCCESS: {
                return
            }
            case ActionTypes.SET_CURRENT_ACCOUNT_SUCCESS: {
                draft.account = action.payload
                return
            }
            case ActionTypes.SET_TON_WALLET_STATE: {
                draft.tonWalletState = action.payload
                return
            }
            case ActionTypes.ADD_NEW_TRANSACTIONS: {
                mergeTransactions(
                    draft.transactions,
                    action.payload.transactions,
                    action.payload.info
                )
                return
            }
            case ActionTypes.RESTORE_KEY_SUCCESS: {
                draft.publicKey = action.payload
                return
            }
            case ActionTypes.SET_FEE_CALCULATION_SUCCESS: {
                draft.currentFee = action.payload
                return
            }
        }
    })
