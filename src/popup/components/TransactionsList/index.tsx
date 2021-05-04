import React, { useEffect } from 'react'
import { createSelector } from 'reselect'
import * as nt from '@nekoton'
import { List } from 'react-virtualized'

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

    // List data as an array of strings
    // const list = [
    //     'Brian Vaughn',
    //     // And so on...
    // ]
    //
    // const rowRenderer = ({
    //     key, // Unique key within array of rows
    //     index, // Index of row within collection
    //     isScrolling, // The List is currently being scrolled
    //     isVisible, // This row is visible within the List (eg it is not an overscanned row)
    //     style, // Style object to be applied to row (to position it)
    // }) => {
    //     return (
    //         <div key={key} style={style}>
    //             <TransactionListItem transaction={transactions[index]} />
    //         </div>
    //     )
    // }

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
            {/*<List*/}
            {/*    width={320}*/}
            {/*    height={600}*/}
            {/*    rowCount={transactions.length}*/}
            {/*    rowHeight={121}*/}
            {/*    rowRenderer={rowRenderer}*/}
            {/*/>*/}
            {transactions?.map((transaction) => {
                return (
                    <TransactionListItem key={`${transaction.id.lt}`} transaction={transaction} />
                )
            })}
        </div>
    )
}

export default TransactionsList
