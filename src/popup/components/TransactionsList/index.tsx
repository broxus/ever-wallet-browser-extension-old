import React, { useEffect, useRef, useState } from 'react'
import * as nt from '@nekoton'

import TransactionListItem from '@popup/components/TransactionsListItem'

import './style.scss'

type TransactionListProps = {
    scrollArea: React.RefObject<HTMLDivElement>
    symbol?: nt.Symbol
    transactions: nt.Transaction[]
    onViewTransaction: (transaction: nt.Transaction) => void
}

const TransactionsList: React.FC<TransactionListProps> = ({
    //scrollArea,
    symbol,
    transactions,
    onViewTransaction,
}) => {
    // const [scroll, setScroll] = useState(scrollArea.current?.scrollTop || 0)
    //
    // useEffect(() => {
    //     const onScroll = (e: Event) => {
    //         const scroll = (e.target as HTMLDivElement).scrollTop
    //         setScroll(scroll)
    //     }
    //
    //     scrollArea.current?.addEventListener('scroll', onScroll)
    //     return () => {
    //         scrollArea.current?.removeEventListener('scroll', onScroll)
    //     }
    // }, [scrollArea])
    //
    // const scrollOffset = 365
    // const windowHeight = 600
    // const itemHeight = 109
    // const skippedHeight = scroll > scrollOffset ? scroll + scrollOffset : 0
    // const maxHeight = skippedHeight + windowHeight
    //
    // let offsetTop = 0
    // let currentBottom = 0

    return (
        <div className="user-assets__transactions-list noselect">
            {!(transactions.length > 0) && (
                <p className="transactions-list-empty">History is empty</p>
            )}
            {symbol == null &&
                transactions?.map((transaction) => {
                    return (
                        <TransactionListItem
                            //style={i == 0 ? { top: offsetTop } : {}}
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
