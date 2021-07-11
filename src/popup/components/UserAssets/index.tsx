import * as React from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import { TransactionsList } from '@popup/components/TransactionsList'
import { AssetsList } from '@popup/components/UserAssets/components'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import { BriefMessageInfo, TokenWalletsToUpdate } from '@shared/backgroundApi'
import { SelectedAsset, TokenWalletState } from '@shared/utils'

import './style.scss'


enum AssetsTab {
    ASSETS,
    TRANSACTIONS,
}

type Props = {
    tonWalletAsset: nt.TonWalletAsset
    tokenWalletAssets: nt.TokenWalletAsset[]
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

export function UserAssets({
    tonWalletAsset,
    tokenWalletAssets,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    transactions,
    scrollArea,
    updateTokenWallets,
    onViewTransaction,
    onViewAsset,
    preloadTransactions,
}: Props): JSX.Element {
    const accountability = useAccountability()
    const rpcState = useRpcState()

    const [activeTab, setActiveTab] = React.useState<AssetsTab>(AssetsTab.ASSETS)

    const pendingTransactions = React.useMemo(() => {
        const values: BriefMessageInfo[] = []

        if (accountability.selectedAccountAddress == null) {
            return values
        }

        window.ObjectExt.values({
            ...rpcState.state.accountPendingTransactions[accountability.selectedAccountAddress]
        }).forEach((entry) => {
            values.push(entry)
        })

        return values.sort((a, b) => b.createdAt - a.createdAt)
    }, [accountability.selectedAccountAddress, rpcState.state.accountPendingTransactions])

    return (
        <>
            <div className="user-assets">
                <div className="user-assets__panel noselect">
                    <div
                        className={classNames('user-assets__panel__tab', {
                            _active: activeTab == AssetsTab.ASSETS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.ASSETS)}
                    >
                        Assets
                    </div>
                    <div
                        className={classNames('user-assets__panel__tab', {
                            _active: activeTab == AssetsTab.TRANSACTIONS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.TRANSACTIONS)}
                    >
                        Transactions
                    </div>
                </div>
                {activeTab == AssetsTab.ASSETS && (
                    <AssetsList
                        tonWalletAsset={tonWalletAsset}
                        tokenWalletAssets={tokenWalletAssets}
                        tonWalletState={tonWalletState}
                        onViewAsset={onViewAsset}
                        knownTokens={knownTokens}
                        tokenWalletStates={tokenWalletStates}
                        updateTokenWallets={updateTokenWallets}
                    />
                )}
                {activeTab == AssetsTab.TRANSACTIONS && (
                    <TransactionsList
                        topOffset={397 + 54}
                        fullHeight={600}
                        scrollArea={scrollArea}
                        transactions={transactions}
                        pendingTransactions={pendingTransactions}
                        onViewTransaction={onViewTransaction}
                        preloadTransactions={preloadTransactions}
                    />
                )}
            </div>
        </>
    )
}
