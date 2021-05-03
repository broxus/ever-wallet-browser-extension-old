import React, { useState } from 'react'
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
}

const TransactionListItem: React.FC<ITransactionsListItem> = ({ transaction, additionalInfo }) => {
    const [detailsPanelOpen, setDetailsPanelOpen] = useState(false)
    const value = extractTransactionValue(transaction)
    const { address } = extractTransactionAddress(transaction)
    const txAddress = extractTransactionAddress(transaction)
    // @ts-ignore
    let total: number = Decimal.abs(value).add(transaction.totalFees)
    if (value.lessThan(0)) {
        total *= -1
    }

    return (
        <>
            <div className="transactions-list-item" onClick={() => setDetailsPanelOpen(true)}>
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
                                {address && convertAddress(address)}
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
            <SlidingPanel isOpen={detailsPanelOpen} onClose={() => setDetailsPanelOpen(false)}>
                <TransactionInfo
                    date={new Date(transaction.createdAt * 1000).toLocaleTimeString()}
                    txAddress={txAddress}
                    amount={convertTons(value.toString())}
                    fee={convertTons(transaction.totalFees)}
                    total={convertTons(total.toString())}
                    address={address || ''}
                    txHash={transaction.id.hash}
                />
            </SlidingPanel>
        </>
    )
}

export default TransactionListItem
