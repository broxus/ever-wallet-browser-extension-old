import * as nt from '../../../../nekoton/pkg'

export type Locale = 'en_US' | 'ru_RU'

export type AppState = {
    accountLoaded: boolean
    locale: Locale
    account: string
    tonWalletState: nt.AccountState | null
    transactions: nt.Transaction[]
}

export type Action = {
    type: string
    payload?: any
}

export type MessageToPrepare = {
    amount: string
    recipient: string
    comment?: string
}
