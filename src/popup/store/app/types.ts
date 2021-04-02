import {AccountState, GeneratedMnemonic, Transaction} from '../../../../nekoton/pkg'

export type Locale = 'en_US' | 'ru_RU'

// export type AppState = Readonly<{
//     locale: Locale
//     seed: string
// }>

export type AppState = {
    locale: Locale
    seed: string[]
    accountType: any
    phrase: GeneratedMnemonic
    publicKey: string
    createdKey: string
    account: string,
    tonWalletState: AccountState | null,
    transactions: Transaction[],
    currentFee: string,
}

export type Action = {
    type: string
    payload?: any
}

export type MessageToPrepare = {
    amount: string,
    recipient: string,
    comment?: string,
};
