import * as React from 'react'

import * as nt from '@nekoton'
import { AccountDetails } from '@popup/components/AccountDetails'
import { CreateAccount } from '@popup/components/AccountsManagement/components'
import { DeployWallet } from '@popup/components/DeployWallet'
import UserAssets from '@popup/components/UserAssets'
import SlidingPanel from '@popup/components/SlidingPanel'
import Receive from '@popup/components/Receive'
import Send from '@popup/components/Send'
import { ManageSeeds } from '@popup/components/AccountsManagement'
import KeyStorage from '@popup/components/KeyStorage'
import TransactionInfo from '@popup/components/TransactionInfo'
import AssetFull from '@popup/components/AssetFull'
import CollectTokens from '@popup/components/CollectTokens'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { SelectedAsset } from '@shared/utils'

import './style.scss'


const INITIAL_DATA_KEY = 'initial_data'

export function MainPage(): JSX.Element | null {
    const accountability = useAccountability()
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [selectedTransaction, setSelectedTransaction] = React.useState<nt.Transaction>()
    const [selectedAsset, setSelectedAsset] = React.useState<SelectedAsset>()
    const [ethEventContract, setEthEventContract] = React.useState<string>()
    const scrollArea = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        ;(async () => {
            const initialData = await rpc.tempStorageRemove(INITIAL_DATA_KEY)
            if (typeof initialData === 'number') {
                drawer.setPanel(initialData)
            }
        })()
    }, [])

    if (rpcState.state?.selectedAccount == null) {
        return null
    }

    const closePanel = () => {
        setSelectedTransaction(undefined)
        setSelectedAsset(undefined)
        setEthEventContract(undefined)
        drawer.setPanel(undefined)
        accountability.reset()
    }

    const { selectedAccount, selectedConnection, storedKeys, knownTokens } = rpcState.state

    const externalAccount = rpcState.state.externalAccounts.find((account) => account.address === selectedAccount.tonWallet.address)
    let selectedKeys = []
    if (externalAccount !== undefined) {
        selectedKeys = externalAccount.externalIn.map(key => storedKeys[key])
    }
    else {
        selectedKeys = [storedKeys[selectedAccount.tonWallet.publicKey]]
    }

    const selectedKey = selectedKeys[0]
    if (selectedKey === undefined) {
        return null
    }

    const accountName = selectedAccount.name
    const accountAddress = selectedAccount.tonWallet.address

    const tonWalletAsset = selectedAccount.tonWallet
    const tokenWalletAssets =
        selectedAccount.additionalAssets[selectedConnection.group]?.tokenWallets || []

    const tonWalletState = rpcState.state.accountContractStates[accountAddress] as
        | nt.ContractState
        | undefined
    const tokenWalletStates = rpcState.state.accountTokenStates[accountAddress] || {}

    const transactions = rpcState.state.accountTransactions[accountAddress] || []

    const sendMessage = async (message: nt.SignedMessage) => {
        return rpc.sendMessage(accountAddress, message)
    }

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
                    {drawer.currentPanel === Panel.SEND && tonWalletState && (
                        <Send
                            accountName={accountName}
                            tonWalletAsset={tonWalletAsset}
                            tokenWalletAssets={tokenWalletAssets}
                            keyEntry={selectedKey}
                            tonWalletState={tonWalletState}
                            tokenWalletStates={tokenWalletStates}
                            knownTokens={knownTokens}
                            estimateFees={async (params) =>
                                await rpc.estimateFees(accountAddress, params)
                            }
                            prepareMessage={async (params, password) =>
                                rpc.prepareMessage(accountAddress, params, password)
                            }
                            prepareTokenMessage={async (owner, rootTokenContract, params) =>
                                rpc.prepareTokenMessage(owner, rootTokenContract, params)
                            }
                            sendMessage={sendMessage}
                            onBack={closePanel}
                        />
                    )}
                    {drawer.currentPanel === Panel.MANAGE_SEEDS && <ManageSeeds />}
                    {drawer.currentPanel === Panel.DEPLOY && <DeployWallet />}
                    {drawer.currentPanel === Panel.CREATE_ACCOUNT && <CreateAccount />}
                    {drawer.currentPanel === Panel.ASSET && selectedAsset && (
                        <AssetFull
                            account={selectedAccount}
                            tokenWalletStates={tokenWalletStates}
                            selectedKey={selectedKey}
                            selectedAsset={selectedAsset}
                            controllerState={rpcState.state}
                            controllerRpc={rpc}
                        />
                    )}
                    {(drawer.currentPanel === Panel.TRANSACTION && selectedTransaction !== undefined) && (
                        <TransactionInfo transaction={selectedTransaction} />
                    )}
                </>
            </SlidingPanel>
        </>
    )
}
