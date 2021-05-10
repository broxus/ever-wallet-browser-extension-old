import React, { useState } from 'react'
import cn from 'classnames'
import * as nt from '@nekoton'

import SlidingPanel from '@popup/components/SlidingPanel'
import AddNewToken from '@popup/components/AddNewToken'
import Button from '@popup/components/Button'
import AssetsListItem from '@popup/components/AssetsListItem'
import TransactionsList from '@popup/components/TransactionsList'

import './style.scss'
import { SelectedAsset } from '@shared/utils'

type AssetsListProps = {
    account: nt.AssetsList
    tonWalletState: nt.ContractState | undefined
    setActiveContent: (arg0: number) => void
    onSeeFull: (asset: SelectedAsset) => void
}

enum Panel {
    ADD_NEW_TOKEN,
}

const AssetsList: React.FC<AssetsListProps> = ({ account, tonWalletState, onSeeFull }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()

    const closePanel = () => setOpenedPanel(undefined)

    return (
        <div className="user-assets__assets-list">
            <AssetsListItem
                tonWalletState={tonWalletState}
                onClick={() =>
                    onSeeFull({
                        type: 'ton_wallet',
                        data: {
                            address: account.tonWallet.address,
                        },
                    })
                }
            />
            {/*tonWalletState && <div onClick={() => onSeeFull()}></div>*/}
            <div className="user-assets__assets-list__add-new-btn">
                <Button
                    text={'Add new asset'}
                    white
                    onClick={() => setOpenedPanel(Panel.ADD_NEW_TOKEN)}
                />
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <AddNewToken onBack={closePanel} />
            </SlidingPanel>
        </div>
    )
}

type IUserAssets = {
    account: nt.AssetsList
    tonWalletState: nt.ContractState | undefined
    transactions: nt.Transaction[]
    setActiveContent: (arg0: number) => void
    onViewTransaction: (transaction: nt.Transaction) => void
    onSeeFull: (asset: SelectedAsset) => void
}

enum AssetsTab {
    ASSETS,
    TRANSACTIONS,
}

const UserAssets: React.FC<IUserAssets> = ({
    account,
    tonWalletState,
    transactions,
    setActiveContent,
    onViewTransaction,
    onSeeFull,
}) => {
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
                </div>
                {activeTab == AssetsTab.ASSETS && (
                    <AssetsList
                        account={account}
                        tonWalletState={tonWalletState}
                        setActiveContent={setActiveContent}
                        onSeeFull={onSeeFull}
                    />
                )}
                {activeTab == AssetsTab.TRANSACTIONS && (
                    <TransactionsList
                        transactions={transactions}
                        onViewTransaction={onViewTransaction}
                    />
                )}
            </div>
        </>
    )
}

export default UserAssets
