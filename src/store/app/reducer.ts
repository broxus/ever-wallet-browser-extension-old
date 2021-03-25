import { produce } from 'immer'
import { ActionTypes } from './actions'
import { Action, AppState } from './types'

export const initialState = Object.freeze<AppState>({
    locale: 'en_US',
    seed: '',
    key: '',
    publicKey: '',
})

export default (state: AppState = initialState, action: Action): AppState =>
    produce(state, (draft: AppState) => {
        switch (action.type) {
            case ActionTypes.SETLOCALE: {
                draft.locale = action.payload
                return
            }
            case ActionTypes.GENERATE_SEED_SUCCESS: {
                draft.seed = action.payload.split(' ')
                return
            }
            case ActionTypes.GENERATE_KEY_SUCCESS: {
                draft.key = action.payload
                draft.publicKey = action.payload.publicKey
                return
            }
            case ActionTypes.ADD_KEY_SUCCESS: {
                return
            }
            case ActionTypes.RESTORE_KEY_SUCCESS: {
                draft.publicKey = action.payload
            }
        }
    })
