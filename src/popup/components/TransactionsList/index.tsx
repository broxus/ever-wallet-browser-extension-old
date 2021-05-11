import React from 'react'
import * as nt from '@nekoton'

import TransactionListItem from '@popup/components/TransactionsListItem'

import './style.scss'

type TransactionListProps = {
    symbol?: nt.Symbol
    transactions: nt.Transaction[]
    onViewTransaction: (transaction: nt.Transaction) => void
}

const TransactionsList: React.FC<TransactionListProps> = ({
    symbol,
    transactions,
    onViewTransaction,
}) => {
    return (
        <div className="user-assets__transactions-list">
            {!(transactions.length > 0) && (
                <p className="transactions-list-empty">History is empty</p>
            )}
            {symbol == null &&
                transactions?.map((transaction) => {
                    return (
                        <TransactionListItem
                            key={`${transaction.id.lt}`}
                            transaction={transaction}
                            onViewTransaction={onViewTransaction}
                        />
                    )
                })}
            {symbol != null &&
                transactions
                    ?.filter((transaction: nt.Transaction) => {
                        const tokenTransaction = transaction as nt.TokenWalletTransaction
                        return tokenTransaction.info != null
                    })
                    .map((transaction) => {
                        return (
                            <TransactionListItem
                                key={`${transaction.id.lt}`}
                                symbol={symbol}
                                transaction={transaction}
                                onViewTransaction={onViewTransaction}
                            />
                        )
                    })}
        </div>
    )
}

export default TransactionsList
