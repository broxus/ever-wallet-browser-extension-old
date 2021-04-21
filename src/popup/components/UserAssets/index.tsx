import React, { useEffect, useState } from 'react'
import cn from 'classnames'
import * as nt from '@nekoton'

import SlidingPanel from '@components/SlidingPanel'
import AddNewToken from '@components/AddNewToken'
import Button from '@components/Button'
import Asset from '@components/Asset'
import TransactionsList from '@components/TransactionsList'

import './style.scss'

type AssetsListProps = {
    tonWalletState: nt.AccountState | null
    setActiveContent: (arg0: number) => void
}

enum Panel {
    ADD_NEW_TOKEN,
}

const AssetsList: React.FC<AssetsListProps> = ({ tonWalletState, setActiveContent }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()

    const closePanel = () => setOpenedPanel(undefined)

    return (
        <div className="user-assets">
            {/*TODO remove later*/}
            {tonWalletState && (
                <div onClick={() => setActiveContent(6)}>
                    <Asset tonWalletState={tonWalletState} />
                </div>
            )}
            <div className="user-assets__add-new-btn">
                <Button
                    text={'Add new asset'}
                    white
                    onClick={() => setOpenedPanel(Panel.ADD_NEW_TOKEN)}
                />
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <AddNewToken onReturn={closePanel} />
            </SlidingPanel>
        </div>
    )
}

type IUserAssets = {
    tonWalletState: nt.AccountState | null
    transactions: nt.Transaction[]
    setActiveContent: (arg0: number) => void
}

enum AssetsTab {
    ASSETS,
    TRANSACTIONS,
}

const UserAssets: React.FC<IUserAssets> = ({ tonWalletState, transactions, setActiveContent }) => {
    const [activeTab, setActiveTab] = useState<AssetsTab>(AssetsTab.ASSETS)

    return (
        <>
            <div className="main-page__user-assets">
                <div className="main-page__user-assets-panel">
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab == AssetsTab.ASSETS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.ASSETS)}
                    >
                        Assets
                    </div>
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab == AssetsTab.TRANSACTIONS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.TRANSACTIONS)}
                    >
                        Transactions
                    </div>
                </div>
                {activeTab == AssetsTab.ASSETS && (
                    <AssetsList
                        tonWalletState={tonWalletState}
                        setActiveContent={setActiveContent}
                    />
                )}
                {activeTab == AssetsTab.TRANSACTIONS && (
                    <TransactionsList transactions={transactions} />
                )}
            </div>
        </>
    )
}

export default UserAssets
