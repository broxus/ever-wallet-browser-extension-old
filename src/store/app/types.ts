export type Locale = 'en_US' | 'ru_RU'

export type AppState = Readonly<{
    locale: Locale
}>

export type Action = {
    type: string
    payload: any
}
