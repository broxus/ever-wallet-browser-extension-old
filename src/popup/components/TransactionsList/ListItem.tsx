import * as React from 'react'

import * as nt from '@nekoton'
import AssetIcon from '@popup/components/AssetIcon'
import {
    extractTransactionValue,
    extractTransactionAddress,
    convertAddress,
    convertTons,
    extractTokenTransactionValue,
    extractTokenTransactionAddress,
    convertCurrency,
    trimTokenName,
} from '@shared/utils'

import './style.scss'


const splitAddress = (address: string | undefined) => {
    const half = address != null ? Math.ceil(address.length / 2) : 0
    return half > 0 ? `${address!.slice(0, half)}\n${address!.slice(-half)}` : ''
}

type Props = {
    symbol?: nt.Symbol
    transaction: nt.Transaction
    additionalInfo?: 'staking_reward'
    style?: React.CSSProperties
    onViewTransaction: (transaction: nt.Transaction) => void
}

export function ListItem({
    symbol,
    transaction,
    style,
    onViewTransaction,
}: Props): JSX.Element {
    const value = React.useMemo(() => {
        if (symbol == null) {
            return extractTransactionValue(transaction)
        } else {
            return extractTokenTransactionValue(transaction) || new Decimal(0)
        }
    }, [transaction])
    const txAddress = React.useMemo(() => {
        if (symbol == null) {
            return extractTransactionAddress(transaction)
        } else {
            return extractTokenTransactionAddress(transaction)
        }
    }, [transaction])

    const decimals = symbol == null ? 9 : symbol.decimals
    const currencyName = symbol == null ? 'TON' : symbol.name

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
            <div className="transactions-list-item__amount">
                <div className="transactions-list-item__logo">
                    <AssetIcon
                        type={symbol == null ? 'ton_wallet' : 'token_wallet'}
                        address={symbol?.rootTokenContract || transaction.inMessage.dst!}
                    />
                </div>
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
                    data-tooltip={txAddress ? splitAddress(txAddress.address) : 'Unknown'}
                >
                    {txAddress ? txAddress.address && convertAddress(txAddress.address) : 'Unknown'}
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
        </div>
    )
}
