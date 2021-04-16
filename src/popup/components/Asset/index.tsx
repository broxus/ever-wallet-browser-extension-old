import React from 'react'
import { convertTons, estimateUsd } from '@utils'
import * as nt from '@nekoton'

import TonLogo from '@img/ton-logo.svg'
import Arrow from '@img/arrow.svg'

type IAsset = {
    tonWalletState: nt.AccountState
}

const Asset: React.FC<IAsset> = ({ tonWalletState }) => (
    <div className="main-page__user-assets-asset">
        <div style={{ display: 'flex' }}>
            {/*// @ts-ignore*/}
            <TonLogo style={{ marginRight: '16px', minWidth: '40px' }} />
            <div className="main-page__user-assets-asset-number">
                <span className="main-page__user-assets-asset-number-amount">
                    {convertTons(tonWalletState.balance)} TON
                </span>
                <span className="main-page__user-assets-asset-number-dollars">
                    {`$${estimateUsd(tonWalletState?.balance)}`}
                </span>
            </div>
        </div>
        <Arrow />
    </div>
)

export default Asset
