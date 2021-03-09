import React from 'react'
import { Button } from '../button'
import { AssetsListItem } from '../assetsListItem'

import './style.scss'

const AssetsListTitle = () => (
    <div className="assets-list__title">
        <h1>Assets</h1>
        <Button text="Add" />
        <Button text="White" white />
    </div>
)

export class AssetsList extends React.Component<{}, {}> {
    render() {
        return (
            <div className="assets-list noselect">
                <AssetsListTitle />
                <AssetsListItem
                    address="test"
                    symbol="TON"
                    balanceInteger="123"
                    balanceFractional="00001"
                />
                <AssetsListItem
                    address="test"
                    symbol="USDC"
                    balanceInteger="123"
                    balanceFractional="00001"
                />
                <AssetsListItem
                    address="test"
                    symbol="WETH"
                    balanceInteger="123"
                    balanceFractional="00001"
                />
            </div>
        )
    }
}
