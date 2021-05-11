import React, { useState } from 'react'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { SelectedAsset } from '@shared/utils'
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

interface IMainPage {
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

const MainPage: React.FC<IMainPage> = ({ controllerRpc, controllerState }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()
    const [selectedTransaction, setSelectedTransaction] = useState<nt.Transaction>()
    const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>()
    const [ethEventContract, setEthEventContract] = useState<string>()

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

    const tonWalletState = controllerState.accountContractStates[accountAddress] as
        | nt.ContractState
        | undefined
    const tokenWalletStates = controllerState.accountTokenStates[accountAddress] || {}

    const transactions = controllerState.accountTransactions[accountAddress] || []
    const network = selectedConnection.name

    const toggleNetwork = () => {
        // TODO
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

    const collectTokens = (ethEventContract: string) => {
        setEthEventContract(ethEventContract)
        setOpenedPanel(Panel.COLLECT_TOKENS)
    }

    return (
        <>
            <AccountDetails
                account={selectedAccount}
                tonWalletState={tonWalletState}
                network={network}
                onToggleNetwork={toggleNetwork}
                onLogOut={async () => {
                    await logOut()
                }}
                onReceive={() => setOpenedPanel(Panel.RECEIVE)}
                onSend={() => setOpenedPanel(Panel.SEND)}
                onDeploy={() => setOpenedPanel(Panel.DEPLOY)}
                onCreateAccount={() => setOpenedPanel(Panel.CREATE_ACCOUNT)}
                onOpenKeyStore={() => setOpenedPanel(Panel.KEY_STORAGE)}
            />
            <UserAssets
                account={selectedAccount}
                tonWalletState={tonWalletState}
                tokenWalletStates={tokenWalletStates}
                knownTokens={knownTokens}
                transactions={transactions}
                updateTokenWallets={async (params) =>
                    await controllerRpc.updateTokenWallets(accountAddress, params)
                }
                onViewTransaction={showTransaction}
                onViewAsset={showAsset}
            />
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <>
                    {openedPanel == Panel.RECEIVE && (
                        <Receive accountName={accountName} address={accountAddress} />
                    )}
                    {openedPanel == Panel.SEND && tonWalletState && (
                        <Send
                            account={selectedAccount}
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
                    {openedPanel == Panel.CREATE_ACCOUNT && <CreateAccountPage />}
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
        </Loader>
    )
}

export default MainPage
