import React from 'react'
import {
    convertAddress,
    convertTons,
    extractTransactionAddress,
    extractTransactionValue,
    SelectedAsset,
} from '@shared/utils'
import Decimal from 'decimal.js'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import CopyAddress from '@popup/components/CopyAddress'

import './style.scss'
import { ControllerState } from '@popup/utils/ControllerRpcClient'
import { TokenWalletTransactionInfo } from '@nekoton'
import { EnumItem } from '@nekoton'
import { TransferRecipient } from '@nekoton'

interface ITransactionInfo {
    symbol?: nt.Symbol
    transaction: nt.Transaction
}

const TRANSACTION_NAMES = {
    to: 'Recipient',
    service: 'Recipient',
    from: 'Sender',
}

const TransferTypeMapping = {
    incoming_transfer: 'Incoming transfer',
    outgoing_transfer: 'Outgoing transfer',
    swap_back: 'Swap back',
    accept: 'Accept',
    transfer_bounced: 'Transfer bounced',
    swap_back_bounced: 'Swap back bounced',
}

const TransactionInfo: React.FC<ITransactionInfo> = ({ transaction, symbol }) => {
    const value = extractTransactionValue(transaction)
    const { direction, address } = extractTransactionAddress(transaction)

    const fee = new Decimal(transaction.totalFees)
    const total = value.sub(fee)

    const txHash = transaction.id.hash

    let info: TokenWalletTransactionInfo | undefined

    if (symbol) {
        info = (transaction as nt.TokenWalletTransaction).info
    }

    return (
        <>
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
                    <CopyAddress address={txHash} />
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">
                        {TRANSACTION_NAMES[direction]}
                    </span>
                    <CopyAddress address={address} />
                </div>
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
                        {convertTons(value.toString())}
                    </span>
                </div>
                <div className="transaction-info-tx-details-param">
                    <span className="transaction-info-tx-details-param-desc">Blockchain fee</span>
                    <span className="transaction-info-tx-details-param-value">
                        {convertTons(fee.toString())}
                    </span>
                </div>
                {/*<div className="transaction-info-tx-details-param">*/}
                {/*    <span className="transaction-info-tx-details-param-desc">Total amount</span>*/}
                {/*    <span className="transaction-info-tx-details-param-value">*/}
                {/*        {convertTons(total.toString())}*/}
                {/*    </span>*/}
                {/*</div>*/}
            </div>
            <Button
                white
                onClick={() =>
                    window.open(`https://ton-explorer.com/transactions/${txHash}`, '_blank')
                }
                text={'Open in explorer'}
            />
        </>
    )
}

export default TransactionInfo
