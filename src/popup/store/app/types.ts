import * as nt from '@nekoton'

export type Locale = 'en_US' | 'ru_RU'

export type AppState = {
    locale: Locale
    selectedAccount: nt.AssetsList | null
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
