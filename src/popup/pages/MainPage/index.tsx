import React, { useState } from 'react'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import * as nt from '@nekoton'

import AccountDetails from '@popup/components/AccountDetails'
import UserAssets from '@popup/components/UserAssets'

import SlidingPanel from '@popup/components/SlidingPanel'
import Receive from '@popup/components/Receive'
import Send from '@popup/components/Send'
import KeyStorage from '@popup/components/KeyStorage'
import AssetFull from '@popup/components/AssetFull'
import DeployWallet from '@popup/components/DeployWallet/DeployWallet'
import TransactionInfo from '@popup/components/TransactionInfo'

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
    KEY_STORAGE,
    CREATE_ACCOUNT,
    ASSET,
    TRANSACTION,
}

const MainPage: React.FC<IMainPage> = ({ controllerRpc, controllerState }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()
    const [selectedTransaction, setSelectedTransaction] = useState<nt.Transaction>()

    if (controllerState.selectedAccount == null) {
        return null
    }

    const closePanel = () => {
        setSelectedTransaction(undefined)
        setOpenedPanel(undefined)
    }

    const { selectedAccount, selectedConnection } = controllerState

    const accountName = selectedAccount.name
    const accountAddress = selectedAccount.tonWallet.address

    const tonWalletState = controllerState.accountContractStates[
        accountAddress
    ] as nt.ContractState | null

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

    return (
        <>
            <AccountDetails
                account={controllerState.selectedAccount}
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
                tonWalletState={tonWalletState}
                setActiveContent={setOpenedPanel}
                transactions={transactions}
                onViewTransaction={showTransaction}
            />
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <>
                    {openedPanel == Panel.RECEIVE && (
                        <Receive accountName={accountName} address={accountAddress} />
                    )}
                    {openedPanel == Panel.SEND && tonWalletState && (
                        <Send
                            account={selectedAccount}
                            tonWalletState={tonWalletState}
                            onBack={closePanel}
                            estimateFees={async (params) =>
                                await controllerRpc.estimateFees(accountAddress, params)
                            }
                            prepareMessage={async (params, password) =>
                                controllerRpc.prepareMessage(accountAddress, params, password)
                            }
                            sendMessage={sendMessage}
                        />
                    )}
                    {openedPanel == Panel.DEPLOY && (
                        <DeployWallet
                            account={selectedAccount}
                            tonWalletState={tonWalletState}
                            onBack={closePanel}
                            estimateFees={async () =>
                                await controllerRpc.estimateDeploymentFees(accountAddress)
                            }
                            prepareDeployMessage={async (password) =>
                                controllerRpc.prepareDeploymentMessage(accountAddress, password)
                            }
                            sendMessage={sendMessage}
                        />
                    )}
                    {openedPanel == Panel.KEY_STORAGE && <KeyStorage />}
                    {openedPanel == Panel.CREATE_ACCOUNT && <CreateAccountPage />}
                    {openedPanel == Panel.ASSET && (
                        <AssetFull
                            handleSendReceive={() => {}}
                            onViewTransaction={showTransaction}
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
