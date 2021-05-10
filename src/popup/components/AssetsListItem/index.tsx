import React from 'react'
import { AssetType, convertTons } from '@shared/utils'

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

const AssetsListItem: React.FC<IAssetsListItem> = ({ type, address, balance, name, onClick }) => (
    <div className="assets-list-item" onClick={onClick}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <AssetIcon type={type} address={address} className="assets-list-item__logo" />
            <div className="assets-list-item__balance">
                <span className="assets-list-item__balance__amount">
                    {convertTons(balance || '0')}
                </span>
                <span className="assets-list-item__balance__dollars">{name}</span>
            </div>
        </div>
        <Arrow />
    </div>
)

export default AssetsListItem
