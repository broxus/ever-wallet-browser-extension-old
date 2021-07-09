import * as React from 'react'
import { connect } from 'react-redux'
import { AppState } from '@popup/store/app/types'
import { fetchManifest } from '@popup/store/app/actions'

import WelcomePage from '@popup/pages/WelcomePage'
import { AccountsManagerPage } from '@popup/pages/AccountsManagerPage'
import { MainPage } from '@popup/pages/MainPage'
import { SendPage } from '@popup/pages/SendPage'
import ApprovalPage from '@popup/pages/ApprovalPage'
import ConnectLedgerPage from '@popup/pages/ConnectLedgerPage'
import { DrawerPanelProvider } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import './styles/main.scss'


function App(): JSX.Element | null {
    const rpc = useRpc()
    const rpcState = useRpcState()

    if (
        rpcState.activeTab == null ||
        (rpcState.state.selectedAccount != null &&
            rpcState.activeTab.type === 'fullscreen' &&
            rpcState.activeTab.data == null)
    ) {
        window.close()
        return null
    }

    if (rpcState.activeTab.type === 'fullscreen') {
        if (
            rpcState.state.selectedAccount != null &&
            rpcState.activeTab.data.route == 'connect-ledger'
        ) {
            return <ConnectLedgerPage controllerRpc={rpc} controllerState={rpcState.state} />
        } else if (
            rpcState.state.selectedAccount == null &&
            rpcState.activeTab.data.route == null
        ) {
            return <WelcomePage controllerState={rpcState.state} controllerRpc={rpc} />
        } else {
            window.close()
            return null
        }
    }

    const pendingApprovals = window.ObjectExt.values(rpcState.state.pendingApprovals || {}) as any[]

    if (pendingApprovals.length > 0) {
        return (
            <ApprovalPage
                storedKeys={rpcState.state.storedKeys}
                networkName={rpcState.state.selectedConnection.name}
                accountContractStates={rpcState.state.accountContractStates}
                accountEntries={rpcState.state.accountEntries}
                pendingApprovals={pendingApprovals}
                checkPassword={async (password) => await rpc.checkPassword(password)}
                resolvePendingApproval={async (id, params) =>
                    await rpc.resolvePendingApproval(id, params)
                }
                rejectPendingApproval={async (id, error) =>
                    await rpc.rejectPendingApproval(id, error as any)
                }
            />
        )
    }

    if (rpcState.activeTab.type === 'notification' && rpcState.group === 'send') {
        return <SendPage />
    }

    if (rpcState.activeTab.type === 'notification' && rpcState.group === 'manage_seeds') {
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
