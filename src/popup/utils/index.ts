import Decimal from 'decimal.js'
import * as nt from '@nekoton'
import { ONE_TON } from '@shared/utils'

Decimal.set({ maxE: 500, minE: -500 })

export const parseError = (error: any) => error?.toString?.().replace(/Error: /gi, '')

export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')

export const TOKENS_MANIFEST_URL =
    'https://raw.githubusercontent.com/broxus/ton-assets/master/manifest.json'

export const TOKENS_MANIFEST_REPO = 'https://github.com/broxus/ton-assets'

export const prepareKey = (entry: nt.KeyStoreEntry, password: string): nt.KeyPassword => {
    switch (entry.signerName) {
        case 'encrypted_key': {
            return {
                type: entry.signerName,
                data: {
                    publicKey: entry.publicKey,
                    password,
                },
            } as nt.KeyPassword
        }
        case 'master_key': {
            return {
                type: entry.signerName,
                data: {
                    masterKey: entry.masterKey,
                    publicKey: entry.publicKey,
                    password,
                },
            }
        }
        case 'ledger_key': {
            return {
                type: entry.signerName,
                data: {
                    publicKey: entry.publicKey,
                },
            }
        }
    }
}
