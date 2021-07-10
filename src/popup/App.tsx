import * as React from 'react'
import { connect } from 'react-redux'
import { AppState } from '@popup/store/app/types'
import { fetchManifest } from '@popup/store/app/actions'

import { AccountsManagerPage } from '@popup/pages/AccountsManagerPage'
import { ApprovalPage } from '@popup/pages/ApprovalPage'
import { MainPage } from '@popup/pages/MainPage'
import { SendPage } from '@popup/pages/SendPage'
import { WelcomePage } from '@popup/pages/WelcomePage'
import ConnectLedgerPage from '@popup/pages/ConnectLedgerPage'
import { DrawerPanelProvider } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import './styles/main.scss'


function App(): JSX.Element | null {
    const rpc = useRpc()
    const rpcState = useRpcState()

    const hasActiveTab = rpcState.activeTab != null
    const hasAccount = rpcState.state.selectedAccount != null
    const hasTabData = rpcState.activeTab?.data != null
    const isFullscreen = rpcState.activeTab?.type === 'fullscreen'
    const isNotification = rpcState.activeTab?.type === 'notification'
    // @ts-ignore
    const isLedgerConnectRoute = rpcState.activeTab?.data?.route === 'connect-ledger'

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
        }
        else {
            window.close()
            return null
        }
    }

    if (rpcState.state.pendingApprovalCount) {
        return <ApprovalPage key="approvalPage" />
    }

    if (isNotification && rpcState.group === 'send') {
        return <SendPage key="sendPAge" />
    }

    if (isNotification && rpcState.group === 'manage_seeds') {
        return <AccountsManagerPage key="accountsManagerPAge" />
    }

    return (
        <DrawerPanelProvider key="mainPage" >
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
