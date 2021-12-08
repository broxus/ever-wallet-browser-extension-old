import * as React from 'react'
import Decimal from 'decimal.js'
import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'

import Button from '@popup/components/Button'
import { CopyText } from '@popup/components/CopyText'
import {
    convertCurrency,
    convertTons,
    extractTokenTransactionAddress,
    extractTokenTransactionValue,
    extractTransactionAddress,
    extractTransactionValue,
    trimTokenName,
} from '@shared/utils'

import './style.scss'

type Props = {
    symbol?: nt.Symbol
    transaction: nt.TonWalletTransaction | nt.TokenWalletTransaction
}

const TRANSACTION_NAMES = {
    to: 'Recipient',
    service: 'Recipient',
    from: 'Sender',
    incoming_transfer: 'Sender',
    outgoing_transfer: 'Recipient',
    swap_back: 'Recipient',
}

const TransferTypeMapping = {
    incoming_transfer: 'Incoming transfer',
    outgoing_transfer: 'Outgoing transfer',
    swap_back: 'Swap back',
    accept: 'Accept',
    transfer_bounced: 'Transfer bounced',
    swap_back_bounced: 'Swap back bounced',
}

export function TransactionInfo({ transaction, symbol }: Props): JSX.Element {
    const value = React.useMemo(() => {
        if (symbol == null) {
            return extractTransactionValue(transaction)
        } else {
            return (
                extractTokenTransactionValue(transaction as nt.TokenWalletTransaction) ||
                new Decimal(0)
            )
        }
    }, [transaction])

    let direction: string | undefined, address: string | undefined

    if (symbol == null) {
        const txAddress = extractTransactionAddress(transaction)
        direction = TRANSACTION_NAMES[txAddress.direction]
        address = txAddress.address
    } else {
        const tokenTransaction = transaction as nt.TokenWalletTransaction

        const txAddress = extractTokenTransactionAddress(tokenTransaction)
        if (txAddress && tokenTransaction.info) {
            direction = (TRANSACTION_NAMES as any)[tokenTransaction.info.type]
            address = txAddress?.address
        }
    }

    const decimals = symbol == null ? 9 : symbol.decimals
    const fee = new Decimal(transaction.totalFees)
    const txHash = transaction.id.hash

    let info: nt.TokenWalletTransactionInfo | undefined
    const currencyName = symbol == null ? NATIVE_CURRENCY : symbol.name

    if (symbol) {
        info = (transaction as nt.TokenWalletTransaction).info
    }

    return (
        <div className="transaction-info">
            <h2 className="transaction-info-title noselect">Transaction information</h2>
            <div className="transaction-info-tx-details">
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Date and time</span>
                    <span className="transaction-info-tx-details-param-value">
                        {new Date(transaction.createdAt * 1000).toLocaleString()}
                    </span>
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Hash (ID)</span>
                    <CopyText
                        className="transaction-info-tx-details-param-value copy"
                        id={`copy-${txHash}`}
                        text={txHash}
                    />
                </div>
                {address !== undefined && (
                    <div className="transaction-info-tx-details-param">
                        <span className="transaction-info-tx-details-param-desc">{direction}</span>
                        <CopyText
                            className="transaction-info-tx-details-param-value copy"
                            id={`copy-${address}`}
                            text={address}
                        />
                    </div>
                )}
                {info && (
                    <div className="transaction-info-tx-details-param">
                        <span className="transaction-info-tx-details-param-desc">Info</span>
                        <span className="transaction-info-tx-details-param-value">
                            {TransferTypeMapping?.[info?.type]}
                        </span>
                    </div>
                )}
                <div className="transaction-info-tx-details-separator" />
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Amount</span>
                    <span className="transaction-info-tx-details-param-value">
                        {convertCurrency(value.toString(), decimals)}{' '}
                        {currencyName.length >= 10 ? trimTokenName(currencyName) : currencyName}
                    </span>
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Blockchain fee</span>
                    <span className="transaction-info-tx-details-param-value">
                        {`${convertTons(fee.toString())} ${NATIVE_CURRENCY}`}
                    </span>
                </div>
            </div>
            <Button
                white
                onClick={() =>
                    window.browser.tabs.create({
                        url: `https://ton-explorer.com/transactions/${txHash}`,
                        active: false,
                    })
                }
                text="Open in explorer"
            />
        </div>
    )
}
