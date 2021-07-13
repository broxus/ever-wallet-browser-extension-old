import Decimal from 'decimal.js'
import * as nt from '@nekoton'
import { ONE_TON } from '@shared/utils'

Decimal.set({ maxE: 500, minE: -500 })

export type Fees = {
    transactionFees: string
    attachedAmount?: string
}

export type FormattedFrees = {
    transactionFees: string
    attachedAmount?: string
    total: string
}

export const parseError = (error: any) => error?.toString?.().replace(/Error: /gi, '')

export const convertFees = (fees: Fees): FormattedFrees => {
    const transactionFees = new Decimal(fees.transactionFees).div(ONE_TON)
    const attachedAmount =
        fees.attachedAmount != null ? new Decimal(fees.attachedAmount).div(ONE_TON) : undefined
    const total = transactionFees.add(attachedAmount || '0')

    return {
        transactionFees: transactionFees.toFixed(),
        attachedAmount: attachedAmount != null ? attachedAmount.toFixed() : undefined,
        total: total.toFixed(),
    }
}

export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')

export const getHost = (url: string, defaultProtocol = 'https://') => {
    const hasProtocol = url && url.match(/^[a-z]*:\/\//)
    const urlObj = new URL(hasProtocol ? url : `${defaultProtocol}${url}`)
    const { hostname } = urlObj
    return hostname
}

export const getIconUrl = (url: string) => {
    return `https://api.faviconkit.com/${getHost(url)}/64`
}

export const TOKENS_MANIFEST_URL =
    'https://raw.githubusercontent.com/broxus/ton-assets/master/manifest.json'

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
