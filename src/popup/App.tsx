import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import { setupCurrentAccount } from '@store/app/actions'
import { Step } from '@common'
import { Action } from '@utils'
import { IControllerRpcClient } from '@utils/ControllerRpcClient'
import {
    ENVIRONMENT_TYPE_POPUP,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_BACKGROUND,
} from '../shared/constants'
import { ConnectionData } from '../shared/models'
import init, * as nt from '@nekoton'

import WelcomePage from './pages/WelcomePage'
import MainPage from './pages/MainPage'
import NewAccountPage from './pages/NewAccountPage'
import RestoreAccountPage from './pages/RestoreAccountPage'
import ApprovalPage from './pages/ApprovalPage'

import Oval from '@img/oval.svg'
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
    | nt.EnumItem<typeof ENVIRONMENT_TYPE_BACKGROUND, undefined>

interface IApp {
    activeTab: ActiveTab
    controllerRpc: IControllerRpcClient
    accountLoaded: boolean
    setupCurrentAccount: Action<typeof setupCurrentAccount>
}

enum Network {
    Mainnet,
    Testnet,
}

// temp
const NETWORK_PARAMS: { [K in Network]: { name: string; params: ConnectionData } } = {
    [Network.Mainnet]: {
        name: 'Mainnet',
        params: {
            type: 'graphql',
            data: {
                endpoint: 'https://main.ton.dev/graphql',
                timeout: 60000,
            },
        },
    },
    [Network.Testnet]: {
        name: 'Testnet',
        params: {
            type: 'graphql',
            data: {
                endpoint: 'https://net.ton.dev/graphql',
                timeout: 60000,
            },
        },
    },
}

const App: React.FC<IApp> = ({ activeTab, controllerRpc, accountLoaded, setupCurrentAccount }) => {
    const [step, setStep] = useState<number>(Step.LOADING)
    const [controllerState, setControllerState] = useState<any>()
    const [network, setNetwork] = useState<Network>(Network.Mainnet)

    useEffect(() => {
        init('index_bg.wasm').then(async () => {
            const hasAccount = await setupCurrentAccount()
            if (!hasAccount) {
                setStep(Step.WELCOME)
            }

            controllerRpc.onNotification((data) => {
                const state = data.params

                if (
                    activeTab.type === 'notification' &&
                    Object.keys((state as any).pendingApprovals).length === 0
                ) {
                    closeCurrentWindow()
                } else {
                    console.log('Got state', state)
                    setControllerState(state)
                }
            })

            controllerRpc.getState((error, state) => {
                setControllerState(state)
                console.log(error, state)
            })
        })
    }, [])

    useEffect(() => {
        if (accountLoaded) {
            setStep(Step.MAIN)
        }
    }, [accountLoaded])

    const onToggleNetwork = async () => {
        const nextNetwork = network == Network.Mainnet ? Network.Testnet : Network.Mainnet
        await controllerRpc.changeNetwork(NETWORK_PARAMS[nextNetwork].params, (error) => {
            if (!error) {
                setNetwork(nextNetwork)
            }
        })
    }

    const renderMainPage = () => {
        const pendingApprovals = Object.values(controllerState?.pendingApprovals || {}) as any[]

        if (pendingApprovals.length != 0) {
            return (
                <ApprovalPage
                    pendingApprovals={pendingApprovals}
                    resolvePendingApproval={async (id, params) => {
                        controllerRpc.resolvePendingApproval(id, params, () => {})
                    }}
                    rejectPendingApproval={async (id, error) => {
                        controllerRpc.rejectPendingApproval(id, error, () => {})
                    }}
                />
            )
        } else {
            const networkParams = NETWORK_PARAMS[network]

            return (
                <MainPage
                    network={networkParams.name}
                    onToggleNetwork={onToggleNetwork}
                    setStep={setStep}
                />
            )
        }
    }

    return (
        <>
            {step == Step.LOADING && <Loader />}
            {step == Step.WELCOME && <WelcomePage setStep={setStep} />}
            {step == Step.CREATE_NEW_WALLET && <NewAccountPage setStep={setStep} />}
            {step == Step.RESTORE_WALLET && <RestoreAccountPage setStep={setStep} />}
            {step == Step.MAIN && renderMainPage()}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    accountLoaded: store.app.selectedAccount != null,
})

export default connect(mapStateToProps, {
    setupCurrentAccount,
})(App)
