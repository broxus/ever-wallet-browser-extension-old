import { AppDispatch } from '@popup/store'

export type Locale = 'en_US' | 'ru_RU'

export type AppState = {
    locale: Locale
    tokensManifest: TokensManifest | undefined
    tokensMeta: { [rootTokenContract: string]: TokensManifestItem }
}

export type Action = {
    type: string
    payload?: any
}

export type TokensManifest = {
    name: string
    version: {
        major: number
        minor: number
        patch: number
    }
    keywords: string[]
    timestamp: string
    tokens: TokensManifestItem[]
}

export type TokensManifestItem = {
    name: string
    address: string
    symbol: string
    decimals: number
    logoURI?: string
    version?: number
}

export type StoreAction<F extends Function> = F extends (
    ...args: infer A
) => (app: AppDispatch) => Promise<infer R>
    ? (...args: A) => Promise<R>
    : never
