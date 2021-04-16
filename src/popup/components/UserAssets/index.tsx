import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import * as nt from '@nekoton'

import SlidingPanel from '@components/SlidingPanel'
import AddNewToken from '@components/AddNewToken'
import Button from '@components/Button'
import Asset from '@components/Asset'
import TransactionsList from '@components/TransactionsList'

import './style.scss'

type UserAssetsProps = {
    tonWalletState: nt.AccountState | null
    transactions: nt.Transaction[]
    setActiveContent: (arg0: number) => void
}

type AssetsListProps = {
    tonWalletState: nt.AccountState | null
    setActiveContent: (arg0: number) => void
}

const AssetsList: React.FC<AssetsListProps> = ({ tonWalletState, setActiveContent }) => {
    const [panelVisible, setPanelVisible] = useState(false)

    useEffect(() => {
        console.log(tonWalletState, 'tonWalletState')
    })
    return (
        <div className="user-assets">
            {/*TODO remove later*/}
            {tonWalletState && (
                <div onClick={() => setActiveContent(6)}>
                    <Asset tonWalletState={tonWalletState} />
                </div>
            )}
            <div className="user-assets__add-new-btn">
                <Button text={'Add new asset'} white onClick={() => setPanelVisible(true)} />
            </div>
            <SlidingPanel isOpen={panelVisible} setIsOpen={setPanelVisible}>
                <AddNewToken onReturn={setPanelVisible} />
            </SlidingPanel>
        </div>
    )
}

const UserAssets: React.FC<UserAssetsProps> = ({
    tonWalletState,
    transactions,
    setActiveContent,
}) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = [
        <AssetsList tonWalletState={tonWalletState} setActiveContent={setActiveContent} />,
        <TransactionsList transactions={transactions} />,
    ]

    return (
        <>
            <div className="main-page__user-assets">
                <div className="main-page__user-assets-panel">
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab === 0,
                        })}
                        onClick={() => setActiveTab(0)}
                    >
                        Assets
                    </div>
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab === 1,
                        })}
                        onClick={() => setActiveTab(1)}
                    >
                        Transactions
                    </div>
                </div>
                {content[activeTab]}
            </div>
        </>
    )
}

export default UserAssets
