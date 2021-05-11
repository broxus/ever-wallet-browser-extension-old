import React from 'react'
import { AssetType, convertCurrency, convertTons } from '@shared/utils'

import AssetIcon from '@popup/components/AssetIcon'
import Arrow from '@popup/img/arrow.svg'

import './style.scss'

type IAssetsListItem = {
    type: AssetType
    address: string
    balance?: string
    name?: string
    decimals?: number
    onClick: () => void
}

const AssetsListItem: React.FC<IAssetsListItem> = ({
    type,
    address,
    balance,
    name,
    decimals,
    onClick,
}) => (
    <div className="assets-list-item noselect" onClick={onClick}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <AssetIcon type={type} address={address} className="assets-list-item__logo" />
            <div className="assets-list-item__balance">
                <span className="assets-list-item__balance__amount">
                    {decimals && convertCurrency(balance || '0', decimals)}
                </span>
                <span className="assets-list-item__balance__dollars">{name}</span>
            </div>
        </div>
        <Arrow />
    </div>
)

export default AssetsListItem
