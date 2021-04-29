import React, { useState } from 'react'
import { ControllerState, IControllerRpcClient } from '@utils/ControllerRpcClient'
import { MessageToPrepare } from '../../../shared/models'
import * as nt from '@nekoton'

import AccountDetails from '@components/AccountDetails'
import UserAssets from '@components/UserAssets'

import SlidingPanel from '@components/SlidingPanel'
import Receive from '@components/Receive'
import Send from '@components/Send'
import KeyStorage from '@components/KeyStorage'
import CreateAccountPage from '../CreateAccountPage'
import AssetFull from '@components/AssetFull'
import DeployWallet from '@components/DeployWallet/DeployWallet'

import './style.scss'

interface IMainPage {
    controllerState: ControllerState
    controllerRpc: IControllerRpcClient
}

enum Panel {
    RECEIVE,
    SEND,
    KEY_STORAGE,
    CREATE_ACCOUNT,
    ASSET,
    DEPLOY,
}

const MainPage: React.FC<IMainPage> = ({ controllerRpc, controllerState }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()

    if (controllerState.selectedAccount == null) {
        return null
    }

    const closePanel = () => setOpenedPanel(undefined)

    const { selectedAccount, selectedConnection } = controllerState

    const accountName = selectedAccount.name
    const accountAddress = selectedAccount.tonWallet.address

    const tonWalletState = controllerState.accountStates[accountAddress] as nt.AccountState | null
    const transactions = controllerState.accountTransactions[accountAddress] || []
    const network = selectedConnection.name

    const toggleNetwork = () => {
        // TODO
    }

    const logOut = async () => {
        await controllerRpc.logOut()
    }

    const estimateFees = async (params: MessageToPrepare) => {
        return await controllerRpc.estimateFees(accountAddress, params)
    }

    const prepareMessage = async (params: MessageToPrepare, password: nt.KeyPassword) => {
        return controllerRpc.prepareMessage(accountAddress, params, password)
    }

    const sendMessage = async (message: nt.SignedMessage) => {
        return controllerRpc.sendMessage(accountAddress, message)
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
                            estimateFees={estimateFees}
                            prepareMessage={prepareMessage}
                            sendMessage={sendMessage}
                        />
                    )}
                    {openedPanel == Panel.KEY_STORAGE && <KeyStorage />}
                    {openedPanel == Panel.CREATE_ACCOUNT && <CreateAccountPage />}
                    {openedPanel == Panel.ASSET && <AssetFull handleSendReceive={() => {}} />}
                    {openedPanel == Panel.DEPLOY && (
                        <DeployWallet account={selectedAccount} tonWalletState={tonWalletState} />
                    )}
                </>
            </SlidingPanel>
        </>
    )
}

export default MainPage
