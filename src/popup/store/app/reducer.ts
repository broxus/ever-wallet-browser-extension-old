import { produce } from 'immer'
import { ActionTypes } from './actions'
import { Action, AppState } from './types'
import * as nt from '../../../../nekoton/pkg'

// @ts-ignore
export const initialState = Object.freeze<AppState>({
    locale: 'en_US',
    seed: '',
    phrase: {},
    createdKey: '',
    publicKey: '',
    account: ''
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
            case ActionTypes.GENERATE_KEY_SUCCESS: {
                draft.createdKey = action.payload
                draft.publicKey = action.payload.publicKey
                return
            }
            case ActionTypes.ADD_KEY_SUCCESS: {
                return
            }
            case ActionTypes.SET_CURRENT_ACCOUNT_SUCCESS {
                draft.account = action.payload
                return
            }
            case ActionTypes.RESTORE_KEY_SUCCESS: {
                draft.publicKey = action.payload
            }
        }
    })
