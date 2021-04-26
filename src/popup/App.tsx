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
    activeTab?: ActiveTab
    controllerRpc: IControllerRpcClient
    accountLoaded: boolean
    setupCurrentAccount: Action<typeof setupCurrentAccount>
}

const App: React.FC<IApp> = ({ controllerRpc, accountLoaded, setupCurrentAccount }) => {
    const [step, setStep] = useState<number>(Step.LOADING)
    const [controllerState, setControllerState] = useState<any>()

    useEffect(() => {
        init('index_bg.wasm').then(async () => {
            const hasAccount = await setupCurrentAccount()
            if (!hasAccount) {
                setStep(Step.WELCOME)
            }

            controllerRpc.onNotification((state) => {
                console.log('Updated state', state)
                setControllerState(state)
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

    const renderMainPage = () => {
        const pendingApprovals = Object.values(controllerState?.pendingApprovals || {}) as any[]

        console.log('Pending approvals:', pendingApprovals)

        if (pendingApprovals.length != 0) {
            return (
                <ApprovalPage
                    pendingApprovals={pendingApprovals}
                    resolvePendingApproval={async (id, params) => {
                        controllerRpc.resolvePendingApproval(id, params, () => {
                            console.log('Done resolve')
                        })
                    }}
                    rejectPendingApproval={async (id, error) => {
                        controllerRpc.rejectPendingApproval(id, error, () => {
                            console.log('Done reject')
                        })
                    }}
                />
            )
        } else {
            return <MainPage setStep={setStep} />
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
