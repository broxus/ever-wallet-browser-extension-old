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
import NewAccountPage from './pages/NewAccountScreen'

import RestoreAccountPage from './pages/RestoreAccountScreen'

import Oval from '@img/oval.svg'
import './styles/main.scss'
import WalletInteract from './pages/ConnectWalletScreen'

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
    const [notificationValue, setNotificationValue] = useState<any>()

    useEffect(() => {
        init('index_bg.wasm').then(async () => {
            const hasAccount = await setupCurrentAccount()
            if (!hasAccount) {
                setStep(Step.WELCOME)
            }

            controllerRpc.getState((error, response) => {
                setNotificationValue(response)
                console.log(error, response)
            })
        })
    }, [])

    useEffect(() => {
        if (accountLoaded) {
            setStep(Step.MAIN)
            // setStep(Step.CONNECT_WALLET)
        }
    }, [accountLoaded])

    return (
        <>
            {step == Step.LOADING && <Loader />}
            {step == Step.WELCOME && <WelcomePage setStep={setStep} />}
            {step == Step.CREATE_NEW_WALLET && <NewAccountPage setStep={setStep} />}
            {step == Step.RESTORE_WALLET && <RestoreAccountPage setStep={setStep} />}
            {step == Step.MAIN && <MainPage setStep={setStep} />}
            {step == Step.NOTIFICATION_SEND && (
                <WalletInteract
                    localStep={1}
                    notificationValue={notificationValue}
                    setStep={setStep}
                />
            )}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    accountLoaded: store.app.selectedAccount != null,
})

export default connect(mapStateToProps, {
    setupCurrentAccount,
})(App)
