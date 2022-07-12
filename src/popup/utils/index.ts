import Decimal from 'decimal.js'
import * as nt from '@nekoton'
import { ONE_TON } from '@shared/utils'

Decimal.set({ maxE: 500, minE: -500 })

export const parseError = (error: any) => error?.toString?.().replace(/Error: /gi, '')

export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')

export const TOKENS_MANIFEST_URL =
    'https://raw.githubusercontent.com/broxus/ton-assets/master/manifest.json'

export const TOKENS_MANIFEST_REPO = 'https://github.com/broxus/ton-assets'

export const ignoreCheckPassword = (keyPassword: nt.KeyPassword) =>
    keyPassword.type !== 'ledger_key' && keyPassword.data.password == null

export type PrepareKeyParams = {
    keyEntry: nt.KeyStoreEntry
    password?: string
    context?: nt.LedgerSignatureContext
    cache?: boolean
}

export const prepareKey = ({
    keyEntry,
    password,
    context,
    cache,
}: PrepareKeyParams): nt.KeyPassword => {
    switch (keyEntry.signerName) {
        case 'encrypted_key': {
            return {
                type: keyEntry.signerName,
                data: {
                    publicKey: keyEntry.publicKey,
                    password,
                    cache,
                },
            } as nt.KeyPassword
        }
        case 'master_key': {
            return {
                type: keyEntry.signerName,
                data: {
                    masterKey: keyEntry.masterKey,
                    publicKey: keyEntry.publicKey,
                    password,
                    cache,
                },
            }
        }
        case 'ledger_key': {
            return {
                type: keyEntry.signerName,
                data: {
                    publicKey: keyEntry.publicKey,
                    context,
                },
            }
        }
    }
}
