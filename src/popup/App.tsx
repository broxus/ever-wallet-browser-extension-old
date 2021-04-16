import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import { setupCurrentAccount } from '@store/app/actions'
import { Step } from '@common'
import { Action } from '@utils'

import WelcomePage from './pages/WelcomePage'
import MainPage from './pages/MainPage'
import NewAccountPage from './pages/NewAccountScreen'
import RestoreAccountPage from './pages/RestoreAccountScreen'

import './styles/main.scss'

interface IApp {
    accountLoaded: boolean
    setupCurrentAccount: Action<typeof setupCurrentAccount>
}

const App: React.FC<IApp> = ({ accountLoaded, setupCurrentAccount }) => {
    const [step, setStep] = useState<number>(Step.WELCOME)

    useEffect(() => {
        setupCurrentAccount().then(() => {})
    }, [])

    useEffect(() => {
        if (accountLoaded) {
            setStep(Step.MAIN)
        }
    }, [accountLoaded])

    return (
        <>
            {step == Step.WELCOME && <WelcomePage setStep={setStep} />}
            {step == Step.CREATE_NEW_WALLET && <NewAccountPage setStep={setStep} />}
            {step == Step.RESTORE_WALLET && <RestoreAccountPage setStep={setStep} />}
            {step == Step.MAIN && <MainPage setStep={setStep} />}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    accountLoaded: store.app.selectedAccount != null,
})

export default connect(mapStateToProps, { setupCurrentAccount })(App)
