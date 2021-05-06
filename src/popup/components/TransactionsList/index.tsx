import React from 'react'
import * as nt from '@nekoton'

import TransactionListItem from '@popup/components/TransactionsListItem'

import './style.scss'

type TransactionListProps = {
    transactions: nt.Transaction[]
    onViewTransaction: (transaction: nt.Transaction) => void
}

const TransactionsList: React.FC<TransactionListProps> = ({ transactions, onViewTransaction }) => {
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
            {transactions?.map((transaction) => {
                return (
                    <TransactionListItem
                        key={`${transaction.id.lt}`}
                        transaction={transaction}
                        onViewTransaction={onViewTransaction}
                    />
                )
            })}
        </div>
    )
}

export default TransactionsList
