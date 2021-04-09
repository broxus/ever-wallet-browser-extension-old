import { AccountState, GeneratedMnemonic, Transaction } from '../../../../nekoton/pkg'
import { Immutable } from 'immer'

export type Locale = 'en_US' | 'ru_RU'

// export type AppState = Readonly<{
//     locale: Locale
//     seed: string
// }>

export type AppState = {
    accountType: any
    accountLoaded: boolean
    error: string
    walletType: 'SafeMultisig (default)' | 'SafeMultisig24' | 'Setcode Multisig' | 'Surf' | ''
    pwd: string
    locale: Locale
    seed: string[]
    phrase: GeneratedMnemonic | {}
    publicKey: string
    createdKey: string
    account: string
    tonWalletState: AccountState | null
    transactions: Transaction[]
    currentFee: string
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
