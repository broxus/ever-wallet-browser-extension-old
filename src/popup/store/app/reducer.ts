import { produce } from 'immer'
import { ActionTypes } from './actions'
import { Action, AppState } from './types'
import { Transaction } from '../../../../nekoton/pkg'
import { mergeTransactions } from '../../../background/common'

export const initialState: AppState = {
    accountLoaded: false,
    locale: 'en_US',
    account: '',
    tonWalletState: null,
    transactions: new Array<Transaction>(),
}

export default (state: AppState = initialState, action: Action): AppState =>
    // @ts-ignore
    produce(state, (draft: AppState) => {
        switch (action.type) {
            case ActionTypes.SETLOCALE: {
                draft.locale = action.payload
                return
            }
            case ActionTypes.SET_ACCOUNT_LOADED: {
                draft.accountLoaded = action.payload.loaded
                draft.account = action.payload.currentAccount
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
                draft.tonWalletState = action.payload.newState
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
            case ActionTypes.RESTORE_ACCOUNT_SUCCESS: {
                draft.account = action.payload
                return
            }
            case ActionTypes.RESET_ACCOUNTS: {
                // @ts-ignore
                return initialState
            }
        }
    })
