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
    amount: string
    createdAt: number
    recipient: string
    style?: React.CSSProperties
}

export function MessageItem({
    amount,
    createdAt,
    recipient,
    style,
}: Props): JSX.Element {
    return (
        <div
            className="transactions-list-item"
            style={style}
        >
            <div className="transactions-list-item__logo">
                <AssetIcon address={recipient} type="ton_wallet" />
            </div>

            <div className="transactions-list-item__scope">
                <div className="transactions-list-item__amount">
                    <div>
                        <div className="transactions-list-item__description transactions-list-item__expense">
                            {'- '}
                            {convertCurrency(amount, 9)}
                            {' TON'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                        className="transactions-list-item__description transactions-list-item__address"
                        data-tooltip={recipient ? splitAddress(recipient) : 'Unknown'}
                    >
                        {recipient ? recipient&& convertAddress(recipient) : 'Unknown'}
                    </span>
                    <span className="transactions-list-item__description transactions-list-item__date">
                        {new Date(createdAt * 1000).toLocaleString('default', {
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                        })}
                    </span>
                </div>

                <div className="transactions-list-item__labels">
                    <div className="transactions-list-item__label-in-progress">
                        Transaction in progress
                    </div>
                </div>
            </div>
        </div>
    )
}
