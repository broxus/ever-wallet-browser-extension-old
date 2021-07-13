import * as React from 'react'

import * as nt from '@nekoton'
import { AccountDetails } from '@popup/components/AccountDetails'
import { AssetFull } from '@popup/components/AssetFull'
import { CreateAccount } from '@popup/components/AccountsManagement/components'
import { DeployWallet } from '@popup/components/DeployWallet'
import { ManageSeeds } from '@popup/components/AccountsManagement'
import { MultisigTransactionSign } from '@popup/components/MultisigTransaction'
import { TransactionInfo } from '@popup/components/TransactionInfo'
import { UserAssets } from '@popup/components/UserAssets'
import Receive from '@popup/components/Receive'
import SlidingPanel from '@popup/components/SlidingPanel'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { SelectedAsset, isSubmitTransaction } from '@shared/utils'

import './style.scss'

const INITIAL_DATA_KEY = 'initial_data'

export function MainPage(): JSX.Element | null {
    const accountability = useAccountability()
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [selectedTransaction, setSelectedTransaction] = React.useState<
        nt.TonWalletTransaction | nt.TokenWalletTransaction
    >()
    const [selectedAsset, setSelectedAsset] = React.useState<SelectedAsset>()
    const scrollArea = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        ;(async () => {
            const initialData = await rpc.tempStorageRemove(INITIAL_DATA_KEY)
            if (typeof initialData === 'number') {
                drawer.setPanel(initialData)
            }
        })()
    }, [])

    if (accountability.selectedAccount == null) {
        return null
    }

    const closePanel = () => {
        setSelectedTransaction(undefined)
        setSelectedAsset(undefined)
        drawer.setPanel(undefined)
        accountability.reset()
    }

    const {
        externalAccounts,
        knownTokens,
        selectedAccount,
        selectedConnection,
        storedKeys,
    } = rpcState.state

    const accountName = selectedAccount?.name as string
    const accountAddress = selectedAccount?.tonWallet.address as string
    const accountPublicKey = selectedAccount?.tonWallet.publicKey as string

    const selectedKeys = React.useMemo(() => {
        let keys: nt.KeyStoreEntry[] = [storedKeys[accountPublicKey]]
        const externals = externalAccounts.find((account) => account.address === accountAddress)

        if (externals !== undefined) {
            keys = keys.concat(externals.externalIn.map((key) => storedKeys[key]))
        }

        return keys.filter((e) => e)
    }, [accountability.selectedAccount, externalAccounts, storedKeys])

    if (selectedKeys[0] === undefined) {
        return null
    }

    const tonWalletAsset = accountability.selectedAccount.tonWallet
    const tokenWalletAssets =
        accountability.selectedAccount.additionalAssets[selectedConnection.group]?.tokenWallets ||
        []
    const tonWalletState = rpcState.state.accountContractStates[accountAddress] as
        | nt.ContractState
        | undefined
    const tokenWalletStates = rpcState.state.accountTokenStates[accountAddress] || {}

    const transactions = rpcState.state.accountTransactions[accountAddress] || []

    const showTransaction = (transaction: nt.Transaction) => {
        setSelectedTransaction(transaction)
        drawer.setPanel(Panel.TRANSACTION)
    }

    const showAsset = (selectedAsset: SelectedAsset) => {
        setSelectedAsset(selectedAsset)
        drawer.setPanel(Panel.ASSET)
    }

    return (
        <>
            <div className="main-page__content" ref={scrollArea}>
                <AccountDetails />
                <UserAssets
                    tonWalletAsset={tonWalletAsset}
                    tokenWalletAssets={tokenWalletAssets}
                    tonWalletState={tonWalletState}
                    tokenWalletStates={tokenWalletStates}
                    knownTokens={knownTokens}
                    transactions={transactions}
                    scrollArea={scrollArea}
                    updateTokenWallets={async (params) =>
                        await rpc.updateTokenWallets(accountAddress, params)
                    }
                    onViewTransaction={showTransaction}
                    onViewAsset={showAsset}
                    preloadTransactions={({ lt, hash }) =>
                        rpc.preloadTransactions(accountAddress, lt, hash)
                    }
                />
            </div>

            <SlidingPanel isOpen={drawer.currentPanel != null} onClose={closePanel}>
                <>
                    {drawer.currentPanel === Panel.RECEIVE && (
                        <Receive accountName={accountName} address={accountAddress} />
                    )}
                    {drawer.currentPanel === Panel.MANAGE_SEEDS && <ManageSeeds />}
                    {drawer.currentPanel === Panel.DEPLOY && <DeployWallet />}
                    {drawer.currentPanel === Panel.CREATE_ACCOUNT && <CreateAccount />}
                    {drawer.currentPanel === Panel.ASSET && selectedAsset && (
                        <AssetFull
                            tokenWalletStates={tokenWalletStates}
                            selectedKeys={selectedKeys}
                            selectedAsset={selectedAsset}
                        />
                    )}
                    {drawer.currentPanel === Panel.TRANSACTION &&
                        selectedTransaction != null &&
                        (isSubmitTransaction(selectedTransaction) ? (
                            <MultisigTransactionSign transaction={selectedTransaction} />
                        ) : (
                            <TransactionInfo transaction={selectedTransaction} />
                        ))}
                </>
            </SlidingPanel>
        </>
    )
}
