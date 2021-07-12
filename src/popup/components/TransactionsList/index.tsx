import * as React from 'react'

import * as nt from '@nekoton'
import { ListItem } from '@popup/components/TransactionsList/ListItem'
import { MessageItem } from '@popup/components/TransactionsList/MessageItem'
import { StoredBriefMessageInfo } from '@shared/backgroundApi'

import './style.scss'
import { AggregatedMultisigTransactions, currentUtime } from '@shared/utils'
import { useRpcState } from '@popup/providers/RpcStateProvider'

const TRANSACTION_HEIGHT = 109
const TRANSACTION_WITH_LABEL_HEIGHT = 138
const TRANSACTION_WITH_EXTENDED_LABEL_HEIGHT = 186
const PRELOAD_HEIGHT = TRANSACTION_HEIGHT * 12

type Props = {
    tonWalletAsset: nt.TonWalletAsset
    topOffset: number
    fullHeight: number
    scrollArea: React.RefObject<HTMLDivElement>
    symbol?: nt.Symbol
    transactions: nt.Transaction[]
    pendingTransactions?: StoredBriefMessageInfo[]
    onViewTransaction: (transaction: nt.Transaction) => void
    preloadTransactions: (continuation: nt.TransactionId) => Promise<void>
}

export function TransactionsList({
    tonWalletAsset,
    topOffset,
    fullHeight,
    scrollArea,
    symbol,
    transactions,
    pendingTransactions,
    onViewTransaction,
    preloadTransactions,
}: Props) {
    const rpcState = useRpcState()

    const [scroll, setScroll] = React.useState(scrollArea.current?.scrollTop || 0)
    const [latestContinuation, setLatestContinuation] = React.useState<nt.TransactionId>()

    const multisigTransactions = rpcState.state.accountMultisigTransactions[
        tonWalletAsset.address
    ] as AggregatedMultisigTransactions | undefined

    const contractType = tonWalletAsset.contractType

    const tonWalletDetails = React.useMemo(() => {
        return nt.getContractTypeDetails(contractType)
    }, [contractType])

    React.useEffect(() => {
        setScroll(scrollArea.current?.scrollTop || 0)
    })

    React.useEffect(() => {
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
    const now = currentUtime()

    const detailsPart = Math.max(topOffset - scroll, 0)
    const visibleHeight = fullHeight - detailsPart
    const hiddenHeight = Math.max(scroll - topOffset, 0)
    const maxHeight = hiddenHeight + visibleHeight

    let maxVisibleHeight = 0
    let totalHeight = 0
    let offsetHeight = 0
    let startIndex: number | undefined = undefined
    let endIndex: number | undefined = undefined

    let couldSkipHeightComputation = multisigTransactions == null

    for (let i = 0; i < transactions.length; ++i) {
        const transaction = transactions[i] as nt.TonWalletTransaction | nt.TokenWalletTransaction

        let transactionHeight = TRANSACTION_HEIGHT

        if (!couldSkipHeightComputation) {
            if (transaction.info?.type === 'wallet_interaction') {
                if (transaction.info?.data.method.type !== 'multisig') {
                    couldSkipHeightComputation = true
                } else {
                    switch (transaction.info.data.method.data.type) {
                        case 'confirm': {
                            transactionHeight = 0
                            break
                        }
                        case 'submit': {
                            const transactionId =
                                transaction.info.data.method.data.data.transactionId
                            if (transactionId == '0') {
                                couldSkipHeightComputation = true
                                break
                            }

                            const multisigTransaction = multisigTransactions?.[transactionId]

                            if (
                                multisigTransaction == null ||
                                multisigTransaction.finalTransactionHash != null
                            ) {
                                break
                            }

                            if (transaction.createdAt + tonWalletDetails.expirationTime <= now) {
                                transactionHeight = TRANSACTION_WITH_LABEL_HEIGHT
                            } else {
                                transactionHeight = TRANSACTION_WITH_EXTENDED_LABEL_HEIGHT
                            }
                            break
                        }
                        case 'send': {
                            couldSkipHeightComputation = true
                            break
                        }
                    }
                }
            }
        }

        totalHeight += transactionHeight

        // Just skip transactions after visible area
        if (endIndex !== undefined) {
            continue
        }

        // Set index for last transaction in visible area
        if (maxVisibleHeight >= maxHeight) {
            endIndex = i
            continue
        }

        // Set index for first transaction in visible area
        if (startIndex === undefined && maxVisibleHeight + transactionHeight >= hiddenHeight) {
            offsetHeight = maxVisibleHeight
            startIndex = i
        }

        // Increase visible area maximum height
        maxVisibleHeight += transactionHeight
    }

    const slice = transactions.slice(startIndex, endIndex)

    return (
        <div className="user-assets__transactions-list noselect">
            {!(transactions.length > 0) && (
                <p className="transactions-list-empty">History is empty</p>
            )}
            <div style={{ height: `${offsetHeight}px` }} />
            {pendingTransactions?.map((message) => (
                <MessageItem key={message.messageHash} message={message} />
            ))}
            {slice.map((transaction) => {
                return (
                    <ListItem
                        key={transaction.id.hash}
                        symbol={symbol}
                        transaction={transaction}
                        onViewTransaction={onViewTransaction}
                    />
                )
            })}
            {endIndex != null && <div style={{ height: `${totalHeight - maxVisibleHeight}px` }} />}
        </div>
    )
}
