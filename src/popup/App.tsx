import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import WelcomeScreen from './pages/WelcomeScreen/WelcomeScreen'
import PolicySignScreen from './pages/PolicySignScreen/PolicySignScreen'
import MainPageScreen from './pages/MainPage/MainPageScreen'
import NewAccountScreen from './pages/NewAccountScreen'
import RestoreAccountScreen from './pages/RestoreAccountScreen'

import { AppState } from './store/app/types'
import { checkAccounts } from './store/app/actions'
import { Step, Action } from './common'

import './styles/main.scss'

interface IApp {
    accountLoaded: boolean
    checkAccounts: Action<typeof checkAccounts>
}

const App: React.FC<IApp> = ({ accountLoaded, checkAccounts }) => {
    const [step, setStep] = useState<number>(Step.WELCOME_PAGE)

    useEffect(() => {
        checkAccounts().then(() => {})
    }, [])

    useEffect(() => {
        if (accountLoaded) {
            setStep(Step.MAIN_PAGE)
        }
    }, [accountLoaded])

    return (
        <>
            {step == Step.WELCOME_PAGE && <WelcomeScreen setStep={setStep} />}
            {step == Step.POLICY_SIGN_SCREEN && <PolicySignScreen setStep={setStep} />}
            {step == Step.CREATE_NEW_WALLET && <NewAccountScreen setStep={setStep} />}
            {step == Step.RESTORE_WALLET && <RestoreAccountScreen setStep={setStep} />}
            {step == Step.MAIN_PAGE && <MainPageScreen setStep={setStep} />}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    accountLoaded: store.app.accountLoaded,
})

export default connect(mapStateToProps, { checkAccounts })(App)
