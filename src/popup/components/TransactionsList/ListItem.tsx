import * as React from 'react'
import { useIntl } from 'react-intl'

import * as nt from '@nekoton'
import AssetIcon from '@popup/components/AssetIcon'
import { NATIVE_CURRENCY } from '@shared/constants'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import {
    extractTransactionValue,
    extractTransactionAddress,
    convertAddress,
    convertTons,
    extractTokenTransactionValue,
    extractTokenTransactionAddress,
    convertCurrency,
    trimTokenName,
    isSubmitTransaction,
    currentUtime,
    isConfirmTransaction,
} from '@shared/utils'
import Decimal from 'decimal.js'

import './style.scss'

const splitAddress = (address: string | undefined) => {
    const half = address != null ? Math.ceil(address.length / 2) : 0
    return half > 0 ? `${address!.slice(0, half)}\n${address!.slice(-half)}` : ''
}

enum Label {
    NONE,
    UNCONFIRMED,
    SENT,
    EXPIRED,
}

type Props = {
    symbol?: nt.Symbol
    transaction: nt.TonWalletTransaction | nt.TokenWalletTransaction
    additionalInfo?: 'staking_reward'
    style?: React.CSSProperties
    onViewTransaction: (transaction: nt.Transaction) => void
}

export function ListItem({ symbol, transaction, style, onViewTransaction }: Props): JSX.Element {
    const intl = useIntl()

    if (isConfirmTransaction(transaction)) {
        return <></>
    }

    const accountability = useAccountability()
    const rpcState = useRpcState()

    const decimals = symbol == null ? 9 : symbol.decimals
    const currencyName = symbol == null ? NATIVE_CURRENCY : symbol.name

    const isSubmit = isSubmitTransaction(transaction)

    const transactionId = isSubmit
        ? transaction.info?.data.method.data.data.transactionId
        : undefined

    const value = React.useMemo(() => {
        if (symbol == null) {
            return extractTransactionValue(transaction)
        }
        return (
            extractTokenTransactionValue(transaction as nt.TokenWalletTransaction) || new Decimal(0)
        )
    }, [transaction])
    const recipient = React.useMemo(() => {
        if (symbol == null) {
            return extractTransactionAddress(transaction)
        }
        return extractTokenTransactionAddress(transaction as nt.TokenWalletTransaction)
    }, [transaction])
    const { unconfirmedTransaction, multisigTransaction } = React.useMemo(() => {
        const source = transaction.inMessage.dst

        return source != null && transactionId != null
            ? {
                  unconfirmedTransaction:
                      rpcState.state.accountUnconfirmedTransactions[source]?.[transactionId],
                  multisigTransaction:
                      rpcState.state.accountMultisigTransactions[source]?.[transactionId],
              }
            : {}
    }, [transaction])

    const now = currentUtime(rpcState.state.clockOffset)

    const expiresAt =
        transaction.createdAt + (accountability.contractTypeDetails?.expirationTime || 3600)

    const labelType =
        isSubmit && multisigTransaction != null
            ? multisigTransaction.finalTransactionHash != null
                ? Label.SENT
                : expiresAt > now
                ? Label.UNCONFIRMED
                : Label.EXPIRED
            : Label.NONE

    // wip to hide tooltip on click outside

    // for (const tooltip of document.querySelectorAll('.transactions-list-item__tooltip')) {
    //     tooltip.addEventListener('click', (e) => e.stopPropagation())
    // }

    return (
        <div
            className="transactions-list-item"
            style={style}
            onClick={() => {
                onViewTransaction(transaction)
            }}
        >
            <AssetIcon
                type={symbol == null ? 'ton_wallet' : 'token_wallet'}
                address={symbol?.rootTokenContract || transaction.inMessage.dst!}
                old={symbol != null && symbol.version != 'Tip3'}
                className="transactions-list-item__logo"
            />

            <div className="transactions-list-item__scope">
                <div className="transactions-list-item__amount">
                    <div>
                        <div
                            className={`transactions-list-item__description transactions-list-item__${
                                value.lessThan(0) ? 'expense' : 'income'
                            }`}
                        >
                            {convertCurrency(value.toString(), decimals)}{' '}
                            {currencyName.length >= 10 ? trimTokenName(currencyName) : currencyName}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="transactions-list-item__description transactions-list-item__fees">
                                {intl.formatMessage(
                                    { id: 'TRANSACTIONS_LIST_ITEM_FEES_HINT' },
                                    {
                                        value: convertTons(transaction.totalFees),
                                        symbol: NATIVE_CURRENCY,
                                    }
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                        className="transactions-list-item__description transactions-list-item__address"
                        data-tooltip={
                            recipient
                                ? splitAddress(recipient.address)
                                : intl.formatMessage({
                                      id: 'TRANSACTIONS_LIST_ITEM_RECIPIENT_UNKNOWN_HINT',
                                  })
                        }
                    >
                        {recipient
                            ? recipient.address && convertAddress(recipient.address)
                            : intl.formatMessage({
                                  id: 'TRANSACTIONS_LIST_ITEM_RECIPIENT_UNKNOWN_HINT',
                              })}
                    </span>
                    <span className="transactions-list-item__description transactions-list-item__date">
                        {new Date(transaction.createdAt * 1000).toLocaleString('default', {
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                        })}
                    </span>
                </div>

                {labelType === Label.UNCONFIRMED && (
                    <>
                        <div className="transactions-list-item__labels">
                            <div className="transactions-list-item__label-waiting">
                                {intl.formatMessage({
                                    id: 'TRANSACTIONS_LIST_ITEM_LABEL_WAITING_FOR_CONFIRMATION',
                                })}
                            </div>
                        </div>
                        {unconfirmedTransaction != null && (
                            <div className="transactions-list-item__signatures">
                                {intl.formatMessage(
                                    {
                                        id: 'TRANSACTIONS_LIST_ITEM_LABEL_SIGNATURES',
                                    },
                                    {
                                        received: unconfirmedTransaction.signsReceived || '0',
                                        requested: unconfirmedTransaction.signsRequired || '0',
                                    }
                                )}
                                <br />

                                {intl.formatMessage(
                                    { id: 'TRANSACTIONS_LIST_ITEM_LABEL_EXPIRES_AT' },
                                    {
                                        date: new Date(expiresAt * 1000).toLocaleString('default', {
                                            month: 'long', // TODO: remove
                                            day: 'numeric', // TODO: remove
                                            hour: 'numeric',
                                            minute: 'numeric',
                                        }),
                                    }
                                )}
                            </div>
                        )}
                    </>
                )}

                {labelType === Label.EXPIRED && (
                    <div className="transactions-list-item__labels">
                        <div className="transactions-list-item__label-expired">
                            {intl.formatMessage({
                                id: 'TRANSACTIONS_LIST_ITEM_LABEL_EXPIRED',
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
