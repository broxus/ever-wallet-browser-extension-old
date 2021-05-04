import React, { useEffect } from 'react'
import { createSelector } from 'reselect'
import * as nt from '@nekoton'

import TransactionListItem from '@popup/components/TransactionsListItem'

import './style.scss'

type TransactionListProps = {
    transactions: nt.Transaction[]
}

const TransactionsList: React.FC<TransactionListProps> = ({ transactions }) => {


    // const taxPercentSelector = state => state.shop.taxPercent
    //
    // const taxSelector = createSelector(
    //     taxPercentSelector,
    //     (taxPercent) => taxPercent
    // )
    //
    // const totalSelector = createSelector(
    //     taxSelector,
    //     (subtotal, tax) => ({ total: subtotal + tax })
    // )
    //


    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            {!(transactions.length > 0) && (
                <p className="transactions-list-empty">History is empty</p>
            )}

            {transactions?.map((transaction, i) => {
                return (
                    <TransactionListItem key={`${transaction.id.lt}`} transaction={transaction} />
                )
            })}
        </div>
    )
}

export default TransactionsList
