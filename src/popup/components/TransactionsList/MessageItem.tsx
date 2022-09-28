import * as React from 'react'
import { useIntl } from 'react-intl'
import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'
import { StoredBriefMessageInfo } from '@shared/backgroundApi'
import { convertAddress, convertCurrency } from '@shared/utils'

import AssetIcon from '@popup/components/AssetIcon'

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
    tonWalletAsset: nt.TonWalletAsset
    message: StoredBriefMessageInfo
    style?: React.CSSProperties
}

export function MessageItem({ tonWalletAsset, message, style }: Props): JSX.Element {
    const intl = useIntl()
    const amount = message.type == 'transfer' ? message.data.amount : undefined
    const recipient = message.type == 'transfer' ? message.data.recipient : undefined

    return (
        <div className="transactions-list-item" style={style}>
            <AssetIcon address={''} type="ton_wallet" className="transactions-list-item__logo" />

            <div className="transactions-list-item__scope">
                {amount != null && (
                    <div className="transactions-list-item__amount">
                        <div>
                            <div className="transactions-list-item__description transactions-list-item__expense">
                                -{convertCurrency(amount, 9)}
                                {` ${NATIVE_CURRENCY}`}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span
                        className="transactions-list-item__description transactions-list-item__address"
                        data-tooltip={splitAddress(recipient ? recipient : tonWalletAsset.address)}
                    >
                        {convertAddress(recipient ? recipient : tonWalletAsset.address)}
                    </span>
                    <span className="transactions-list-item__description transactions-list-item__date">
                        {new Date(message.createdAt * 1000).toLocaleString('default', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                        })}
                    </span>
                </div>

                <div className="transactions-list-item__labels">
                    <div className="transactions-list-item__label-in-progress">
                        {intl.formatMessage(
                            { id: 'TRANSACTIONS_LIST_ITEM_LABEL_PROGRESS' },
                            { name: OPERATION_NAME[message.type] }
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
