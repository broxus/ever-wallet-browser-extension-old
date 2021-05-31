import React, { useState } from 'react'
import { SelectedAsset, TokenWalletState } from '@shared/utils'
import { TokenWalletsToUpdate } from '@shared/approvalApi'
import cn from 'classnames'
import * as nt from '@nekoton'

import SlidingPanel from '@popup/components/SlidingPanel'
import AddNewToken from '@popup/components/AddNewToken'
import Button from '@popup/components/Button'
import AssetsListItem from '@popup/components/AssetsListItem'
import TransactionsList from '@popup/components/TransactionsList'

import './style.scss'

type AssetsListProps = {
    account: nt.AssetsList
    tonWalletState: nt.ContractState | undefined
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    updateTokenWallets: (params: TokenWalletsToUpdate) => Promise<void>
    onViewAsset: (asset: SelectedAsset) => void
}

enum Panel {
    ADD_NEW_TOKEN,
}

const AssetsList: React.FC<AssetsListProps> = ({
    account,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    updateTokenWallets,
    onViewAsset,
}) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()

    const closePanel = () => setOpenedPanel(undefined)

    return (
        <div className="user-assets__assets-list">
            <AssetsListItem
                type={'ton_wallet'}
                address={account.tonWallet.address}
                balance={tonWalletState?.balance}
                name={'TON'}
                decimals={9}
                onClick={() =>
                    onViewAsset({
                        type: 'ton_wallet',
                        data: {
                            address: account.tonWallet.address,
                        },
                    })
                }
            />
            {account.tokenWallets.map(({ rootTokenContract }) => {
                const symbol = knownTokens[rootTokenContract]
                const balance = tokenWalletStates[rootTokenContract]?.balance
                return (
                    <AssetsListItem
                        key={rootTokenContract}
                        type={'token_wallet'}
                        address={rootTokenContract}
                        balance={balance}
                        name={symbol?.name}
                        decimals={symbol?.decimals}
                        onClick={() => {
                            onViewAsset({
                                type: 'token_wallet',
                                data: {
                                    owner: account.tonWallet.address,
                                    rootTokenContract,
                                },
                            })
                        }}
                    />
                )
            })}
            <div className="user-assets__assets-list__add-new-btn">
                <Button
                    text={'Select assets'}
                    white
                    onClick={() => setOpenedPanel(Panel.ADD_NEW_TOKEN)}
                />
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <AddNewToken
                    tokenWallets={account.tokenWallets}
                    knownTokens={knownTokens}
                    onSubmit={updateTokenWallets}
                    onBack={closePanel}
                />
            </SlidingPanel>
        </div>
    )
}

type IUserAssets = {
    account: nt.AssetsList
    tonWalletState: nt.ContractState | undefined
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    transactions: nt.Transaction[]
    scrollArea: React.RefObject<HTMLDivElement>
    onViewTransaction: (transaction: nt.Transaction) => void
    updateTokenWallets: (params: TokenWalletsToUpdate) => Promise<void>
    onViewAsset: (asset: SelectedAsset) => void
    preloadTransactions: (continuation: nt.TransactionId) => Promise<void>
}

enum AssetsTab {
    ASSETS,
    TRANSACTIONS,
}

const UserAssets: React.FC<IUserAssets> = ({
    account,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    transactions,
    scrollArea,
    updateTokenWallets,
    onViewTransaction,
    onViewAsset,
    preloadTransactions,
}) => {
    const [activeTab, setActiveTab] = useState<AssetsTab>(AssetsTab.ASSETS)

    return (
        <>
            <div className="user-assets">
                <div className="user-assets__panel noselect">
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
                        onViewAsset={onViewAsset}
                        knownTokens={knownTokens}
                        tokenWalletStates={tokenWalletStates}
                        updateTokenWallets={updateTokenWallets}
                    />
                )}
                {activeTab == AssetsTab.TRANSACTIONS && (
                    <TransactionsList
                        topOffset={365 + 54}
                        fullHeight={600}
                        scrollArea={scrollArea}
                        transactions={transactions}
                        onViewTransaction={onViewTransaction}
                        preloadTransactions={preloadTransactions}
                    />
                )}
            </div>
        </>
    )
}

export default UserAssets
