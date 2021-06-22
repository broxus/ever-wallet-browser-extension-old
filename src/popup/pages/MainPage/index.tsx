import React, { useEffect, useRef, useState } from 'react'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { SelectedAsset } from '@shared/utils'
import { ConnectionDataItem } from '@shared/approvalApi'
import { Environment, ENVIRONMENT_TYPE_NOTIFICATION } from '@shared/constants'
import * as nt from '@nekoton'

import AccountDetails from '@popup/components/AccountDetails'
import UserAssets from '@popup/components/UserAssets'

import SlidingPanel from '@popup/components/SlidingPanel'
import Receive from '@popup/components/Receive'
import Send from '@popup/components/Send'
import KeyStorage from '@popup/components/KeyStorage'
import DeployWallet from '@popup/components/DeployWallet/DeployWallet'
import TransactionInfo from '@popup/components/TransactionInfo'
import AssetFull from '@popup/components/AssetFull'
import CollectTokens from '@popup/components/CollectTokens'

import CreateAccountPage from '@popup/pages/CreateAccountPage'

import './style.scss'

const INITIAL_DATA_KEY = 'initial_data'

interface IMainPage {
    environment: Environment
    controllerState: ControllerState
    controllerRpc: IControllerRpcClient
}

enum Panel {
    RECEIVE,
    SEND,
    DEPLOY,
    COLLECT_TOKENS,
    KEY_STORAGE,
    CREATE_ACCOUNT,
    ASSET,
    TRANSACTION,
}

const MainPage: React.FC<IMainPage> = ({ environment, controllerRpc, controllerState }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()
    const [selectedTransaction, setSelectedTransaction] = useState<nt.Transaction>()
    const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>()
    const [ethEventContract, setEthEventContract] = useState<string>()
    const scrollArea = useRef<HTMLDivElement>(null)

    useEffect(() => {
        ;(async () => {
            const initialData = await controllerRpc.tempStorageRemove(INITIAL_DATA_KEY)
            if (typeof initialData === 'number') {
                setOpenedPanel(initialData)
            }
        })()
    }, [])

    if (controllerState.selectedAccount == null) {
        return null
    }

    const closePanel = () => {
        setSelectedTransaction(undefined)
        setSelectedAsset(undefined)
        setEthEventContract(undefined)
        setOpenedPanel(undefined)
    }

    const { selectedAccount, selectedConnection, storedKeys, knownTokens } = controllerState

    const selectedKey = storedKeys[selectedAccount.tonWallet.publicKey]
    if (selectedKey == null) {
        return null
    }

    const accountName = selectedAccount.name
    const accountAddress = selectedAccount.tonWallet.address

    const tonWalletAsset = selectedAccount.tonWallet
    const tokenWalletAssets =
        selectedAccount.additionalAssets[selectedConnection.group]?.tokenWallets || []

    const tonWalletState = controllerState.accountContractStates[accountAddress] as
        | nt.ContractState
        | undefined
    const tokenWalletStates = controllerState.accountTokenStates[accountAddress] || {}

    const transactions = controllerState.accountTransactions[accountAddress] || []
    const networkId = selectedConnection.id

    const toggleNetwork = async () => {
        const networks = await controllerRpc.getAvailableNetworks()

        let nextNetwork: ConnectionDataItem | undefined
        for (let i = 0; i < networks.length; ++i) {
            const item = networks[i]
            if (item.id == networkId) {
                nextNetwork = networks[(i + 1) % networks.length]
            }
        }

        console.log('Next network:', nextNetwork)
        nextNetwork && (await controllerRpc.changeNetwork(nextNetwork))
    }

    const logOut = async () => {
        await controllerRpc.logOut()
        window.close()
    }

    const sendMessage = async (message: nt.SignedMessage) => {
        return controllerRpc.sendMessage(accountAddress, message)
    }

    const showTransaction = (transaction: nt.Transaction) => {
        setSelectedTransaction(transaction)
        setOpenedPanel(Panel.TRANSACTION)
    }

    const showAsset = (selectedAsset: SelectedAsset) => {
        setSelectedAsset(selectedAsset)
        setOpenedPanel(Panel.ASSET)
    }

    return (
        <>
            <div className="main-page__content" ref={scrollArea}>
                <AccountDetails
                    account={selectedAccount}
                    tonWalletState={tonWalletState}
                    controllerState={controllerState}
                    controllerRpc={controllerRpc}
                    network={selectedConnection.name}
                    onToggleNetwork={toggleNetwork}
                    onLogOut={async () => {
                        await logOut()
                    }}
                    onReceive={() => setOpenedPanel(Panel.RECEIVE)}
                    onSend={async () => {
                        if (environment == ENVIRONMENT_TYPE_NOTIFICATION) {
                            setOpenedPanel(Panel.SEND)
                        } else {
                            await controllerRpc.tempStorageInsert(INITIAL_DATA_KEY, Panel.SEND)
                            await controllerRpc.openExtensionInExternalWindow()
                            window.close()
                        }
                    }}
                    onDeploy={() => setOpenedPanel(Panel.DEPLOY)}
                    onCreateAccount={() => setOpenedPanel(Panel.CREATE_ACCOUNT)}
                    onOpenKeyStore={() => setOpenedPanel(Panel.KEY_STORAGE)}
                />
                <UserAssets
                    tonWalletAsset={tonWalletAsset}
                    tokenWalletAssets={tokenWalletAssets}
                    tonWalletState={tonWalletState}
                    tokenWalletStates={tokenWalletStates}
                    knownTokens={knownTokens}
                    transactions={transactions}
                    scrollArea={scrollArea}
                    updateTokenWallets={async (params) =>
                        await controllerRpc.updateTokenWallets(accountAddress, params)
                    }
                    onViewTransaction={showTransaction}
                    onViewAsset={showAsset}
                    preloadTransactions={({ lt, hash }) =>
                        controllerRpc.preloadTransactions(accountAddress, lt, hash)
                    }
                />
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <>
                    {openedPanel == Panel.RECEIVE && (
                        <Receive accountName={accountName} address={accountAddress} />
                    )}
                    {openedPanel == Panel.SEND && tonWalletState && (
                        <Send
                            accountName={accountName}
                            tonWalletAsset={tonWalletAsset}
                            tokenWalletAssets={tokenWalletAssets}
                            keyEntry={selectedKey}
                            tonWalletState={tonWalletState}
                            tokenWalletStates={tokenWalletStates}
                            knownTokens={knownTokens}
                            onBack={closePanel}
                            estimateFees={async (params) =>
                                await controllerRpc.estimateFees(accountAddress, params)
                            }
                            prepareMessage={async (params, password) =>
                                controllerRpc.prepareMessage(accountAddress, params, password)
                            }
                            prepareTokenMessage={async (owner, rootTokenContract, params) =>
                                controllerRpc.prepareTokenMessage(owner, rootTokenContract, params)
                            }
                            sendMessage={sendMessage}
                        />
                    )}
                    {openedPanel == Panel.DEPLOY && (
                        <DeployWallet
                            account={selectedAccount}
                            keyEntry={selectedKey}
                            tonWalletState={tonWalletState}
                            onBack={closePanel}
                            estimateFees={async () =>
                                controllerRpc.estimateDeploymentFees(accountAddress)
                            }
                            prepareDeployMessage={async (password) =>
                                controllerRpc.prepareDeploymentMessage(accountAddress, password)
                            }
                            sendMessage={sendMessage}
                        />
                    )}
                    {openedPanel == Panel.COLLECT_TOKENS && ethEventContract && (
                        <CollectTokens
                            account={selectedAccount}
                            keyEntry={selectedKey}
                            ethEventAddress={ethEventContract}
                            tonWalletState={tonWalletState}
                            onBack={closePanel}
                            estimateFees={async (params) =>
                                controllerRpc.estimateFees(accountAddress, params)
                            }
                            prepareMessage={async (params, password) =>
                                controllerRpc.prepareMessage(accountAddress, params, password)
                            }
                            sendMessage={sendMessage}
                        />
                    )}
                    {openedPanel == Panel.KEY_STORAGE && <KeyStorage />}
                    {openedPanel == Panel.CREATE_ACCOUNT && (
                        <CreateAccountPage
                            controllerRpc={controllerRpc}
                            controllerState={controllerState}
                            onClose={() => setOpenedPanel(undefined)}
                        />
                    )}
                    {openedPanel == Panel.ASSET && selectedAsset && (
                        <AssetFull
                            account={selectedAccount}
                            tokenWalletStates={tokenWalletStates}
                            selectedKey={selectedKey}
                            selectedAsset={selectedAsset}
                            controllerState={controllerState}
                            controllerRpc={controllerRpc}
                        />
                    )}
                    {openedPanel == Panel.TRANSACTION && selectedTransaction && (
                        <TransactionInfo transaction={selectedTransaction} />
                    )}
                </>
            </SlidingPanel>
        </>
    )
}

export default MainPage
