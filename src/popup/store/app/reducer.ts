import { produce } from 'immer'
import { Action as DispatchAction } from './actions'
import { Action, AppState } from './types'

export const initialState: AppState = {
    locale: 'en_US',
    tokensManifest: undefined,
}

export default (state: AppState = initialState, action: Action): AppState =>
    // @ts-ignore
    produce(state, (draft: AppState) => {
        const handler = DispatchAction[action.type as keyof typeof DispatchAction] as any
        if (handler == null) {
            return initialState
        } else {
            handler(...action.payload)(draft)
        }
    })
