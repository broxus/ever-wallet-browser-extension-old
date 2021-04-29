import { AppDispatch } from '@popup/store'
import { Locale, AppState } from './types'
import * as nt from '@nekoton'

export const Action = {
    setLocale: (locale: Locale) => (draft: AppState) => {
        draft.locale = locale
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

export const generateSeed = () => {
    return nt.generateMnemonic(nt.makeLabsMnemonic(0))
}

export const validateMnemonic = (phrase: string, mnemonicType: nt.MnemonicType) => {
    nt.validateMnemonic(phrase, mnemonicType)
}
