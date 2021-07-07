import * as React from 'react'
import { connect } from 'react-redux'
import { AppState } from '@popup/store/app/types'
import { fetchManifest } from '@popup/store/app/actions'

import WelcomePage from '@popup/pages/WelcomePage'
import { MainPage } from '@popup/pages/MainPage'
import ApprovalPage from '@popup/pages/ApprovalPage'
import ConnectLedgerPage from '@popup/pages/ConnectLedgerPage'
import { AccountabilityProvider } from '@popup/providers/AccountabilityProvider'
import { DrawerPanelProvider } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import Oval from '@popup/img/oval.svg'
import './styles/main.scss'

const Loader: React.FC = () => {
    return (
        <div className="loader-page">
            <img src={Oval} className="loader-page__spinner" alt="" />
        </div>
    )
}


function App(): JSX.Element | null {
    const rpc = useRpc()
    const rpcState = useRpcState()

    if (
        rpcState.activeTab == null || (
            rpcState.state?.selectedAccount != null &&
            rpcState.activeTab.type === 'fullscreen' &&
            rpcState.activeTab.data == null
        )
    ) {
        window.close()
        return null
    }

    if (rpcState.state == null || !rpcState.loaded) {
        return <Loader />
    }

    if (rpcState.activeTab.type === 'fullscreen') {
        if (rpcState.state.selectedAccount != null && rpcState.activeTab.data.route == 'connect-ledger') {
            return <ConnectLedgerPage controllerRpc={rpc} controllerState={rpcState.state} />
        }
        else if (rpcState.state.selectedAccount == null && rpcState.activeTab.data.route == null) {
            return <WelcomePage controllerState={rpcState.state} controllerRpc={rpc} />
        }
        else {
            window.close()
            return null
        }
    }

    const pendingApprovals = Object.values(rpcState.state.pendingApprovals || {}) as any[]

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

    return (
        <DrawerPanelProvider>
            <AccountabilityProvider>
                <MainPage />
            </AccountabilityProvider>
        </DrawerPanelProvider>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    tokensManifest: store.app.tokensManifest,
})

export default connect(mapStateToProps, {
    fetchManifest,
})(App)
