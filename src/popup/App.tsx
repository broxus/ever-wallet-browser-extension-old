import React, { useEffect, useState } from 'react'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
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
}

const App: React.FC<IApp> = ({ activeTab, controllerRpc }) => {
    const [controllerState, setControllerState] = useState<ControllerState>()

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

            if (state.selectedAccount == null && activeTab.type === 'popup') {
                await controllerRpc.openExtensionInBrowser()
                window.close()
            } else if (state.selectedAccount != null && activeTab.type === 'fullscreen') {
                window.close()
            } else {
                setControllerState(state)
            }
        })()
    }, [])

    if (controllerState?.selectedAccount != null && activeTab.type === 'fullscreen') {
        window.close()
        return null
    }

    if (controllerState == null) {
        return <Loader />
    }

    if (controllerState.selectedAccount == null) {
        return <WelcomePage createAccount={async (params) => controllerRpc.createAccount(params)} />
    }

    const pendingApprovals = Object.values(controllerState?.pendingApprovals || {}) as any[]
    if (pendingApprovals.length > 0) {
        return (
            <ApprovalPage
                selectedAccount={controllerState.selectedAccount}
                tonWalletStates={controllerState.accountContractStates}
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

    return <MainPage controllerState={controllerState} controllerRpc={controllerRpc} />
}

export default App
