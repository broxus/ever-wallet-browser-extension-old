import * as React from 'react'

import * as nt from '@nekoton'
import AssetIcon from '@popup/components/AssetIcon'
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
    if (isConfirmTransaction(transaction)) {
        return <></>
    }

    const accountability = useAccountability()
    const rpcState = useRpcState()

    const decimals = symbol == null ? 9 : symbol.decimals
    const currencyName = symbol == null ? 'TON' : symbol.name

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

        return source != null
            ? {
                  unconfirmedTransaction:
                      rpcState.state.accountUnconfirmedTransactions[source]?.[transactionId],
                  multisigTransaction:
                      rpcState.state.accountMultisigTransactions[source]?.[transactionId],
              }
            : {}
    }, [transaction])

    const now = currentUtime()

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
            <div className="transactions-list-item__logo">
                <AssetIcon
                    type={symbol == null ? 'ton_wallet' : 'token_wallet'}
                    address={symbol?.rootTokenContract || transaction.inMessage.dst!}
                />
            </div>

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
                                Fees: {convertTons(transaction.totalFees)} TON
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                        className="transactions-list-item__description transactions-list-item__address"
                        data-tooltip={recipient ? splitAddress(recipient.address) : 'Unknown'}
                    >
                        {recipient
                            ? recipient.address && convertAddress(recipient.address)
                            : 'Unknown'}
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
                                Waiting for confirmation
                            </div>
                        </div>
                        {unconfirmedTransaction != null && (
                            <div className="transactions-list-item__signatures">
                                {`${unconfirmedTransaction.signsReceived} of ${unconfirmedTransaction.signsRequired} signatures`}
                                <br />
                                {`Expires at ${new Date(expiresAt * 1000).toLocaleString(
                                    'default',
                                    {
                                        month: 'long', // TODO: remove
                                        day: 'numeric', // TODO: remove
                                        hour: 'numeric',
                                        minute: 'numeric',
                                    }
                                )}`}
                            </div>
                        )}
                    </>
                )}

                {labelType === Label.EXPIRED && (
                    <div className="transactions-list-item__labels">
                        <div className="transactions-list-item__label-expired">Expired</div>
                    </div>
                )}
            </div>
        </div>
    )
}
