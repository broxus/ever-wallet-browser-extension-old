import React, { useEffect, useRef, useState } from 'react'
import * as nt from '@nekoton'

import TransactionListItem from '@popup/components/TransactionsListItem'

import './style.scss'

const TRANSACTION_HEIGHT = 109
const PRELOAD_HEIGHT = TRANSACTION_HEIGHT * 12

type TransactionListProps = {
    topOffset: number
    fullHeight: number
    scrollArea: React.RefObject<HTMLDivElement>
    symbol?: nt.Symbol
    transactions: nt.Transaction[]
    onViewTransaction: (transaction: nt.Transaction) => void
    preloadTransactions: (continuation: nt.TransactionId) => Promise<void>
}

const TransactionsList: React.FC<TransactionListProps> = ({
    topOffset,
    fullHeight,
    scrollArea,
    symbol,
    transactions,
    onViewTransaction,
    preloadTransactions,
}) => {
    const [scroll, setScroll] = useState(scrollArea.current?.scrollTop || 0)
    const [latestContinuation, setLatestContinuation] = useState<nt.TransactionId>()

    useEffect(() => {
        setScroll(scrollArea.current?.scrollTop || 0)
    })

    useEffect(() => {
        if (scrollArea.current == null || transactions.length == 0) {
            return
        }

        const current = scrollArea.current
        const continuation = transactions[transactions.length - 1].prevTransactionId
        const totalHeight = transactions.length * TRANSACTION_HEIGHT

        let loading = false
        const onScroll = async (e: Event) => {
            if (e.target != scrollArea.current) {
                return
            }

            const scroll = (e.target as HTMLDivElement).scrollTop
            setScroll(scroll)

            if (loading || continuation == null) {
                return
            }

            const currentHeight = totalHeight - scroll
            if (currentHeight > PRELOAD_HEIGHT || continuation.lt == latestContinuation?.lt) {
                return
            }

            loading = true
            try {
                console.log('Preloading transactions')
                await preloadTransactions(continuation)
                setLatestContinuation(continuation)
            } catch (e) {
                console.error(e)
                loading = false
            }
        }

        current.addEventListener('scroll', onScroll)
        return () => {
            console.log('On exit')
            current.removeEventListener('scroll', onScroll)
        }
    }, [scrollArea, transactions, preloadTransactions])

    const detailsPart = Math.max(topOffset - scroll, 0)
    const visibleHeight = fullHeight - detailsPart
    const hiddenHeight = Math.max(scroll - topOffset, 0)
    const maxHeight = hiddenHeight + visibleHeight

    let totalHeight = 0
    let startIndex: number | undefined = undefined
    let endIndex: number | undefined = undefined
    for (let i = 0; i < transactions.length; ++i) {
        if (totalHeight >= maxHeight) {
            endIndex = i
            break
        }
        totalHeight += TRANSACTION_HEIGHT
        if (startIndex == null && totalHeight >= hiddenHeight) {
            startIndex = i
        }
    }

    const offsetHeight = (startIndex || 0) * TRANSACTION_HEIGHT

    const slice = transactions.slice(startIndex, endIndex)

    return (
        <div className="user-assets__transactions-list noselect">
            {!(transactions.length > 0) && (
                <p className="transactions-list-empty">History is empty</p>
            )}
            <div style={{ height: `${offsetHeight}px` }} />
            {slice.map((transaction) => {
                return (
                    <TransactionListItem
                        key={`${transaction.id.lt}`}
                        symbol={symbol}
                        transaction={transaction}
                        onViewTransaction={onViewTransaction}
                    />
                )
            })}
            <div
                style={{ height: `${transactions.length * TRANSACTION_HEIGHT - totalHeight}px` }}
            />
        </div>
    )
}

export default TransactionsList
