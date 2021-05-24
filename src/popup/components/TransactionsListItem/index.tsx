import React, { useMemo } from 'react'
import {
    extractTransactionValue,
    extractTransactionAddress,
    convertAddress,
    convertTons,
    extractTokenTransactionValue,
    extractTokenTransactionAddress,
    convertCurrency,
    trimTokenName,
} from '@shared/utils'
import * as nt from '@nekoton'

import './style.scss'
import AssetIcon from '@popup/components/AssetIcon'

const splitAddress = (address: string | undefined) => {
    const half = address != null ? Math.ceil(address.length / 2) : 0
    return half > 0 ? `${address!.slice(0, half)}\n${address!.slice(-half)}` : ''
}

type ITransactionsListItem = {
    symbol?: nt.Symbol
    transaction: nt.Transaction
    additionalInfo?: 'staking_reward'
    style?: React.CSSProperties
    onViewTransaction: (transaction: nt.Transaction) => void
}

const TransactionListItem: React.FC<ITransactionsListItem> = ({
    symbol,
    transaction,
    style,
    onViewTransaction,
}) => {
    const value = useMemo(() => {
        if (symbol == null) {
            return extractTransactionValue(transaction)
        } else {
            return extractTokenTransactionValue(transaction) || new Decimal(0)
        }
    }, [transaction])
    const txAddress = useMemo(() => {
        if (symbol == null) {
            return extractTransactionAddress(transaction)
        } else {
            return extractTokenTransactionAddress(transaction)
        }
    }, [transaction])

    const decimals = symbol == null ? 9 : symbol.decimals
    const currencyName = symbol == null ? 'TON' : symbol.name

    // wip to hide tooltip on click outside

    // for (const tooltip of document.querySelectorAll('.transactions-list-item__tooltip')) {
    //     tooltip.addEventListener('click', (e) => e.stopPropagation())
    // }

    return (
        <div
            className="transactions-list-item"
            style={style}
            onClick={() => {
                onViewTransaction(transaction)
            }}
        >
            <div className="transactions-list-item__amount">
                <div className="transactions-list-item__logo">
                    <AssetIcon
                        type={symbol == null ? 'ton_wallet' : 'token_wallet'}
                        address={symbol?.rootTokenContract || transaction.inMessage.dst!}
                    />
                </div>
                <div>
                    <div
                        className={`transactions-list-item__description transactions-list-item__${
                            value.lessThan(0) ? 'expense' : 'income'
                        }`}
                    >
                        {convertCurrency(value.toString(), decimals)}{' '}
                        {currencyName.length >= 10 ? trimTokenName(currencyName) : currencyName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="transactions-list-item__description transactions-list-item__fees">
                            Fees: {convertTons(transaction.totalFees)} TON
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span
                    className="transactions-list-item__description transactions-list-item__address"
                    data-tooltip={splitAddress(txAddress?.address)}
                >
                    {txAddress?.address && convertAddress(txAddress.address)}
                </span>
                <span className="transactions-list-item__description transactions-list-item__date">
                    {new Date(transaction.createdAt * 1000).toLocaleString('default', {
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                    })}
                </span>
            </div>
        </div>
    )
}

export default TransactionListItem
