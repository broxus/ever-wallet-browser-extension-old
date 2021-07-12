import * as React from 'react'

import AssetIcon from '@popup/components/AssetIcon'
import { StoredBriefMessageInfo } from '@shared/backgroundApi'
import { convertAddress, convertCurrency } from '@shared/utils'

import './style.scss'

const splitAddress = (address: string | undefined) => {
    const half = address != null ? Math.ceil(address.length / 2) : 0
    return half > 0 ? `${address!.slice(0, half)}\n${address!.slice(-half)}` : ''
}

const OPERATION_NAME: { [k in StoredBriefMessageInfo['type']]: string } = {
    transfer: 'Transfer',
    confirm: 'Confirmation',
    deploy: 'Deploy',
}

type Props = {
    message: StoredBriefMessageInfo
    style?: React.CSSProperties
}

export function MessageItem({ message, style }: Props): JSX.Element {
    const amount = message.type == 'transfer' ? message.data.amount : undefined
    const recipient = message.type == 'transfer' ? message.data.recipient : undefined

    return (
        <div className="transactions-list-item" style={style}>
            <div className="transactions-list-item__logo">
                <AssetIcon address={''} type="ton_wallet" />
            </div>

            <div className="transactions-list-item__scope">
                {amount != null && (
                    <div className="transactions-list-item__amount">
                        <div>
                            <div className="transactions-list-item__description transactions-list-item__expense">
                                -{convertCurrency(amount, 9)}
                                {' TON'}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                        className="transactions-list-item__description transactions-list-item__address"
                        data-tooltip={recipient ? splitAddress(recipient) : 'Unknown'}
                    >
                        {recipient ? recipient && convertAddress(recipient) : 'Unknown'}
                    </span>
                    <span className="transactions-list-item__description transactions-list-item__date">
                        {new Date(message.createdAt * 1000).toLocaleString('default', {
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                        })}
                    </span>
                </div>

                <div className="transactions-list-item__labels">
                    <div className="transactions-list-item__label-in-progress">
                        {OPERATION_NAME[message.type]} in progress
                    </div>
                </div>
            </div>
        </div>
    )
}
