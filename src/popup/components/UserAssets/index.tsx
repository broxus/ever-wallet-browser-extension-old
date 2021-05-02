import React, { useState } from 'react'
import cn from 'classnames'
import * as nt from '@nekoton'

import SlidingPanel from '@popup/components/SlidingPanel'
import AddNewToken from '@popup/components/AddNewToken'
import Button from '@popup/components/Button'
import AssetsListItem from '@popup/components/AssetsListItem'
import TransactionsList from '@popup/components/TransactionsList'

import './style.scss'

type AssetsListProps = {
    tonWalletState: nt.AccountState | null
    setActiveContent: (arg0: number) => void
}

enum Panel {
    ADD_NEW_TOKEN,
}

const AssetsList: React.FC<AssetsListProps> = ({ tonWalletState }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()

    const closePanel = () => setOpenedPanel(undefined)

    return (
        <div className="user-assets__assets-list">
            {/*TODO remove later*/}
            {tonWalletState && (
                // <div onClick={() => setActiveContent(6)}>
                <div>
                    <AssetsListItem tonWalletState={tonWalletState} />
                </div>
            )}
            {/*<div className="user-assets__assets-list__add-new-btn">*/}
            {/*    <Button*/}
            {/*        text={'Add new asset'}*/}
            {/*        white*/}
            {/*        onClick={() => setOpenedPanel(Panel.ADD_NEW_TOKEN)}*/}
            {/*    />*/}
            {/*</div>*/}
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <AddNewToken onBack={closePanel} />
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
    ACTIVITY,
}

const UserAssets: React.FC<IUserAssets> = ({ tonWalletState, transactions, setActiveContent }) => {
    const [activeTab, setActiveTab] = useState<AssetsTab>(AssetsTab.ASSETS)

    return (
        <>
            <div className="user-assets">
                <div className="user-assets__panel">
                    <div
                        className={cn('user-assets__panel__tab', {
                            _active: activeTab == AssetsTab.ASSETS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.ASSETS)}
                    >
                        Assets
                    </div>
                    <div
                        className={cn('user-assets__panel__tab', {
                            _active: activeTab == AssetsTab.TRANSACTIONS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.TRANSACTIONS)}
                    >
                        Transactions
                    </div>
                    <div
                        className={cn('user-assets__panel__tab', {
                            _active: activeTab == AssetsTab.ACTIVITY,
                        })}
                        onClick={() => setActiveTab(AssetsTab.ACTIVITY)}
                    >
                        Activity
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
