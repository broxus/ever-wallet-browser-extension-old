import React, { useEffect, useMemo, useState } from 'react'
import {
    extractTransactionValue,
    extractTransactionAddress,
    convertAddress,
    convertTons,
} from '@shared/utils'
import * as nt from '@nekoton'

import TonLogoS from '@popup/img/ton-logo-s.svg'
import Decimal from 'decimal.js'

import './style.scss'
import TransactionInfo from '@popup/components/TransactionInfo'
import SlidingPanel from '@popup/components/SlidingPanel'

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

    return (
        <div
            className="transactions-list-item"
            onClick={() => {
                console.log('ASDASD', transaction)
                onViewTransaction(transaction)
            }}
        >
            <div style={{ display: 'flex', width: '100%' }}>
                <div style={{ marginRight: '16px', marginTop: '16px', minWidth: '36px' }}>
                    <TonLogoS />
                </div>
                <div className="transactions-list-item__description">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="transactions-list-item__description__date">
                            {new Date(transaction.createdAt * 1000).toLocaleTimeString()}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="transactions-list-item__description__address">
                            {txAddress.address && convertAddress(txAddress.address)}
                        </span>
                        <span
                            className={`transactions-list-item__description__${
                                value.lessThan(0) ? 'expense' : 'income'
                            }`}
                        >
                            {convertTons(value.toString())} TON
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="transactions-list-item__description__fees">
                            Fees: {convertTons(transaction.totalFees)} TON
                        </span>
                    </div>
                    {additionalInfo && (
                        <span
                            className="transactions-list-item__description__comment"
                            style={{ color: '#000000', padding: '10px 0 0' }}
                        >
                            Staking reward.
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TransactionListItem
