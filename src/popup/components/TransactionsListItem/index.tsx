import React, { useMemo } from 'react'
import {
    extractTransactionValue,
    extractTransactionAddress,
    convertAddress,
    convertTons,
} from '@shared/utils'
import * as nt from '@nekoton'

import TonLogoS from '@popup/img/ton-logo-s.svg'
import ReactTooltip from 'react-tooltip'

import './style.scss'

type ITransactionsListItem = {
    transaction: nt.Transaction
    additionalInfo?: 'staking_reward'
    onViewTransaction: (transaction: nt.Transaction) => void
}

const TransactionListItem: React.FC<ITransactionsListItem> = ({
    transaction,
    additionalInfo,
    onViewTransaction,
}) => {
    const value = useMemo(() => extractTransactionValue(transaction), [transaction])
    const txAddress = useMemo(() => extractTransactionAddress(transaction), [transaction])

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
                        {convertTons(value.toString())} TON
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
                    {txAddress.address && convertAddress(txAddress.address)}
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
