import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { AppState, StoreAction } from '@popup/store/app/types'
import { fetchManifest } from '@popup/store/app/actions'
import {
    ENVIRONMENT_TYPE_POPUP,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_BACKGROUND,
    ENVIRONMENT_TYPE_FULLSCREEN,
} from '@shared/constants'
import init, * as nt from '@nekoton'

import WelcomePage from '@popup/pages/WelcomePage'
import MainPage from '@popup/pages/MainPage'
import ApprovalPage from '@popup/pages/ApprovalPage'

import Oval from '@popup/img/oval.svg'

import './styles/main.scss'
import ConnectLedger from '@popup/components/ConnectLedger'

const Loader: React.FC = () => {
    return (
        <div className="loader-page">
            {/*@ts-ignore*/}
            <Oval className="loader-page__spinner" />
        </div>
    )
}

const closeCurrentWindow = () => {
    chrome.windows.getCurrent((windowDetails) => {
        chrome.windows.remove(windowDetails.id)
    })
}

export type ActiveTab =
    | nt.EnumItem<
          typeof ENVIRONMENT_TYPE_POPUP,
          {
              id?: number
              title?: string
              origin: string
              protocol?: string
              url?: string
          }
      >
    | nt.EnumItem<typeof ENVIRONMENT_TYPE_NOTIFICATION, undefined>
    | nt.EnumItem<typeof ENVIRONMENT_TYPE_FULLSCREEN, undefined>
    | nt.EnumItem<typeof ENVIRONMENT_TYPE_BACKGROUND, undefined>

interface IApp {
    activeTab: ActiveTab
    controllerRpc: IControllerRpcClient
    fetchManifest: StoreAction<typeof fetchManifest>
}

const App: React.FC<IApp> = ({ activeTab, controllerRpc, fetchManifest }) => {
    const [controllerState, setControllerState] = useState<ControllerState>()

    const [showLedgerPage, setShowLedgerPage] = useState(false)

    useEffect(() => {
        if (showLedgerPage === true) {
            window.location.href = '/home.html'
        }
    }, [showLedgerPage])

    useEffect(() => {
        ;(async () => {
            const [, state] = await Promise.all([
                init('index_bg.wasm'),
                (async () => {
                    controllerRpc.onNotification((data) => {
                        const state = data.params

                        if (
                            activeTab.type === 'notification' &&
                            Object.keys((state as any).pendingApprovals).length === 0
                        ) {
                            closeCurrentWindow()
                        } else {
                            console.log('Got state', state)
                            setControllerState(state as any)
                        }
                    })

                    return await controllerRpc.getState()
                })(),
            ])

            if (
                state.selectedAccount == null &&
                (activeTab.type === 'popup' || activeTab.type === 'notification')
            ) {
                await controllerRpc.openExtensionInBrowser()
                window.close()
            } else if (state.selectedAccount != null && activeTab.type === 'fullscreen') {
                window.close()
            } else {
                setControllerState(state)
            }

            fetchManifest().catch(console.error)
        })()
    }, [])

    // if (controllerState?.selectedAccount != null && activeTab.type === 'fullscreen') {
    //     window.close()
    //     return null
    // }

    if (controllerState?.selectedAccount != null && activeTab.type === 'fullscreen') {
        if (!showLedgerPage) {
            console.log('!showLedgerPage')
            window.close()
            return null
        } else {
            window.close()
            console.log('showLedgerPage')
            controllerRpc.openExtensionInBrowser()
            return <ConnectLedger onNext={() => {}} />
        }
    }

    if (controllerState == null) {
        return <Loader />
    }

    if (controllerState.selectedAccount == null) {
        return <WelcomePage controllerState={controllerState} controllerRpc={controllerRpc} />
    }

    const pendingApprovals = Object.values(controllerState?.pendingApprovals || {}) as any[]
    if (pendingApprovals.length > 0) {
        return (
            <ApprovalPage
                storedKeys={controllerState.storedKeys}
                accountContractStates={controllerState.accountContractStates}
                accountEntries={controllerState.accountEntries}
                pendingApprovals={pendingApprovals}
                checkPassword={async (password) => await controllerRpc.checkPassword(password)}
                resolvePendingApproval={async (id, params) =>
                    await controllerRpc.resolvePendingApproval(id, params)
                }
                rejectPendingApproval={async (id, error) =>
                    await controllerRpc.rejectPendingApproval(id, error as any)
                }
            />
        )
    }

    return (
        <MainPage
            controllerState={controllerState}
            controllerRpc={controllerRpc}
            setShowLedgerPage={setShowLedgerPage}
        />
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    tokensManifest: store.app.tokensManifest,
})

export default connect(mapStateToProps, {
    fetchManifest,
})(App)
