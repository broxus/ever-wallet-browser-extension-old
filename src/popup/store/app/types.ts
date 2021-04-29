import * as nt from '@nekoton'

export type Locale = 'en_US' | 'ru_RU'

export type AppState = {
    locale: Locale
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
