import React, { useMemo } from 'react'
import {
    AssetType,
    extractTransactionValue,
    extractTransactionAddress,
    convertAddress,
    convertTons,
    extractTokenTransactionValue,
    extractTokenTransactionAddress,
    convertCurrency,
} from '@shared/utils'
import * as nt from '@nekoton'

import TonLogoS from '@popup/img/ton-logo-s.svg'
import ReactTooltip from 'react-tooltip'

import './style.scss'

type ITransactionsListItem = {
    symbol: nt.Symbol | undefined
    transaction: nt.Transaction
    additionalInfo?: 'staking_reward'
    onViewTransaction: (transaction: nt.Transaction) => void
}

const TransactionListItem: React.FC<ITransactionsListItem> = ({
    symbol,
    transaction,
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

    const decimals = symbol == null ? 0 : symbol.decimals
    const currencyName = symbol == null ? 'TON' : symbol.name

    // wip to hide tooltip on click outside

    // for (const tooltip of document.querySelectorAll('.transactions-list-item__tooltip')) {
    //     tooltip.addEventListener('click', (e) => e.stopPropagation())
    // }

    return (
        <div
            className="transactions-list-item"
            onClick={() => {
                onViewTransaction(transaction)
            }}
        >
            <div className="transactions-list-item__amount">
                <div className="transactions-list-item__logo">
                    <TonLogoS />
                </div>
                <div>
                    <div
                        className={`transactions-list-item__description transactions-list-item__${
                            value.lessThan(0) ? 'expense' : 'income'
                        }`}
                    >
                        {convertCurrency(value.toString(), decimals)} {currencyName}
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
                    data-tip={txAddress?.address}
                >
                    {txAddress?.address && convertAddress(txAddress.address)}
                </span>
                <ReactTooltip
                    className="transactions-list-item__tooltip"
                    globalEventOff="click"
                    type="dark"
                    multiline
                    clickable
                    effect="solid"
                    place="bottom"
                />

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
