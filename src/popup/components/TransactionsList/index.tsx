import React from 'react'
import * as nt from '@nekoton'

import Transaction from '@components/Transaction'

type TransactionListProps = {
    transactions: nt.Transaction[]
}

const TransactionsList: React.FC<TransactionListProps> = ({ transactions }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            {transactions?.map((transaction) => {
                return <Transaction transaction={transaction} />
            })}
        </div>
    )
}

export default TransactionsList
