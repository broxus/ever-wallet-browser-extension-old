import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import { setupCurrentAccount } from '@store/app/actions'
import { Step } from '@common'
import { Action } from '@utils'
import { IMetaRPCClient } from '@utils/MetaRPCClient'
import init from '@nekoton'

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

export interface ActiveTab {
    id?: number
    title?: string
    origin: string
    protocol?: string
    url?: string
}

interface IApp {
    activeTab?: ActiveTab
    backgroundConnection: IMetaRPCClient
    accountLoaded: boolean
    setupCurrentAccount: Action<typeof setupCurrentAccount>
}

const App: React.FC<IApp> = ({
    activeTab,
    backgroundConnection,
    accountLoaded,
    setupCurrentAccount,
}) => {
    const [step, setStep] = useState<number>(Step.LOADING)
    const [notificationValue, setNotificationValue] = useState<any>()

    useEffect(() => {
        init('index_bg.wasm').then(async () => {
            const hasAccount = await setupCurrentAccount()
            if (!hasAccount) {
                setStep(Step.WELCOME)
            }

            console.log(activeTab)

            window.NEKOTON_PROVIDER.sendAsync(
                {
                    jsonrpc: '2.0',
                    method: 'getApproval',
                },
                (error: Error | null, response: string) => {
                    if (error) {
                        backgroundConnection.getApproval(response, (error, response) => {
                            setNotificationValue(response)
                            console.log(error)
                        })
                    }
                    console.log(error, response)
                }
            )
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
