import React from 'react'
import { convertTons, estimateUsd } from '@utils'
import * as nt from '@nekoton'

import TonLogo from '@img/ton-logo.svg'
import Arrow from '@img/arrow.svg'

import './style.scss'

type IAssetsListItem = {
    tonWalletState: nt.AccountState
}

const AssetsListItem: React.FC<IAssetsListItem> = ({ tonWalletState }) => (
    <div className="assets-list-item">
        <div style={{ display: 'flex' }}>
            {/*// @ts-ignore*/}
            <TonLogo className="assets-list-item__logo" />
            <div className="assets-list-item__balance">
                <span className="assets-list-item__balance__amount">
                    {convertTons(tonWalletState.balance)} TON
                </span>
                <span className="assets-list-item__balance__dollars">
                    {`$${estimateUsd(tonWalletState?.balance)}`}
                </span>
            </div>
        </div>
        <Arrow />
    </div>
)

export default AssetsListItem
