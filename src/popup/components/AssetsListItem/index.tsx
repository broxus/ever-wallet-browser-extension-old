import React from 'react'
import { convertTons, estimateUsd } from '@shared/utils'
import * as nt from '@nekoton'

import TonLogo from '@popup/img/ton-logo.svg'
import Arrow from '@popup/img/arrow.svg'

import './style.scss'

type IAssetsListItem = {
    tonWalletState: nt.ContractState | undefined
    onClick: () => void
}

const AssetsListItem: React.FC<IAssetsListItem> = ({ tonWalletState, onClick }) => (
    <div className="assets-list-item" onClick={onClick}>
        <div style={{ display: 'flex' }}>
            {/*// @ts-ignore*/}
            <TonLogo className="assets-list-item__logo" />
            <div className="assets-list-item__balance">
                <span className="assets-list-item__balance__amount">
                    {convertTons(tonWalletState?.balance || '0')} TON
                </span>
                <span className="assets-list-item__balance__dollars">
                    {`$${estimateUsd(tonWalletState?.balance || '0')}`}
                </span>
            </div>
        </div>
        <Arrow />
    </div>
)

export default AssetsListItem
