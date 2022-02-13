import * as React from 'react'

import AssetIcon from '@popup/components/AssetIcon'
import { AssetType, convertCurrency } from '@shared/utils'

import Arrow from '@popup/img/arrow.svg'

import './style.scss'

type Props = {
    type: AssetType
    address: string
    balance?: string
    name?: string
    decimals?: number
    old?: boolean
    onClick: () => void
}

export function AssetsListItem({
    type,
    address,
    balance,
    name,
    decimals,
    old,
    onClick,
}: Props): JSX.Element {
    return (
        <div className="assets-list-item noselect" onClick={onClick}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <AssetIcon
                    type={type}
                    address={address}
                    old={old}
                    className="assets-list-item__logo"
                />
                <div className="assets-list-item__balance">
                    <span className="assets-list-item__balance__amount">
                        {decimals != null && convertCurrency(balance || '0', decimals)}
                    </span>
                    <span className="assets-list-item__balance__dollars">{name}</span>
                </div>
            </div>
            <img src={Arrow} alt="" />
        </div>
    )
}
