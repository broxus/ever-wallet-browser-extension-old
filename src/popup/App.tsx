import * as React from 'react'
import { connect } from 'react-redux'
import { AppState } from '@popup/store/app/types'
import { fetchManifest } from '@popup/store/app/actions'

import { AccountsManagerPage } from '@popup/pages/AccountsManagerPage'
import { ApprovalPage } from '@popup/pages/ApprovalPage'
import { DeployMultisigWallet } from '@popup/pages/DeployMultisigWallet'
import { MainPage } from '@popup/pages/MainPage'
import { SendPage } from '@popup/pages/SendPage'
import { WelcomePage } from '@popup/pages/WelcomePage'
import ConnectLedgerPage from '@popup/pages/ConnectLedgerPage'
import { DrawerPanelProvider } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { closeCurrentWindow, useRpcState } from '@popup/providers/RpcStateProvider'

import './styles/main.scss'

function App(): JSX.Element | null {
    const rpc = useRpc()
    const rpcState = useRpcState()

    const accountAddresses = Object.keys(rpcState.state.accountEntries)

    const hasActiveTab = rpcState.activeTab != null
    const hasAccount = accountAddresses.length > 0
    const hasTabData = rpcState.activeTab?.data != null
    const isFullscreen = rpcState.activeTab?.type === 'fullscreen'
    const isNotification = rpcState.activeTab?.type === 'notification'
    // @ts-ignore
    const isLedgerConnectRoute = rpcState.activeTab?.data?.route === 'connect-ledger'

    console.log('AAA', accountAddresses, rpcState.state.selectedAccount)

    if (accountAddresses.length > 0 && rpcState.state.selectedAccount == null) {
        console.log('Addresses:', accountAddresses, rpcState.state.selectedAccount)
        return null
    }

    if (!hasActiveTab || (hasAccount && isFullscreen && !hasTabData)) {
        window.close()
        return null
    }

    if (isFullscreen) {
        if (hasAccount && isLedgerConnectRoute) {
            return <ConnectLedgerPage controllerRpc={rpc} controllerState={rpcState.state} />
        }
        // @ts-ignore
        else if (!hasAccount && rpcState.activeTab?.data?.route == null) {
            return <WelcomePage key="welcomePage" />
        } else {
            window.close()
            return null
        }
    }

    if (rpcState.group === 'approval') {
        if (rpcState.state.pendingApprovalCount == 0) {
            closeCurrentWindow()
            return null
        }
        return <ApprovalPage key="approvalPage" />
    }

    if (isNotification && rpcState.group === 'deploy_multisig_wallet') {
        return <DeployMultisigWallet key="deployMultisigWallet" />
    }

    if (isNotification && rpcState.group === 'send') {
        return <SendPage key="sendPAge" />
    }

    if (isNotification && rpcState.group === 'manage_seeds') {
        return <AccountsManagerPage key="accountsManagerPAge" />
    }

    return (
        <DrawerPanelProvider key="mainPage">
            <MainPage />
        </DrawerPanelProvider>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    tokensManifest: store.app.tokensManifest,
})

export default connect(mapStateToProps, {
    fetchManifest,
})(App)
