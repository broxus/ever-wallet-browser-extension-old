import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import WelcomeScreen from './pages/WelcomeScreen/WelcomeScreen'
import PolicySignScreen from './pages/PolicySignScreen/PolicySignScreen'
import GenerateSeedScreen from './pages/GenerateSeed/GenerateSeedScreen'
import CreatePasswordScreen from './pages/CreatePassword/CreatePasswordScreen'
import MainPageScreen from './pages/MainPage/MainPageScreen'
import SelectWallet from './pages/SelectWallet/SelectWallet'
import CheckSeedScreen from './pages/GenerateSeed/CheckSeedScreen'
import { AppState } from './store/app/types'
import { checkAccounts } from './store/app/actions'
import './styles/main.scss'
import RestoreWalletScreen, { EnterSeedScreen } from './pages/RestoreWallet/RestoreWalletScreen'

interface IApp {
    accountLoaded: boolean
    checkAccounts: () => void
}
const App: React.FC<IApp> = ({ accountLoaded, checkAccounts }) => {
    const [step, setStep] = useState<number>(0)

    const tempScreens = [
        <WelcomeScreen setStep={setStep} />,
        <PolicySignScreen setStep={setStep} />,
        <GenerateSeedScreen setStep={setStep} />,
        <CheckSeedScreen setStep={setStep} />,
        <CreatePasswordScreen setStep={setStep} />,
        <SelectWallet setStep={setStep} restore={false} />,
        <MainPageScreen setStep={setStep} />,
        <RestoreWalletScreen setStep={setStep} />,
        <EnterSeedScreen />,
    ]

    const navigate = (event: { key: any }) => {
        const key = event.key // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
        switch (key) {
            case 'ArrowLeft':
                setStep((prevState) => prevState - 1)
                break
            case 'ArrowRight':
                setStep((prevState) => prevState + 1)
                break
            case 'ArrowUp':
                // Up pressed
                break
            case 'ArrowDown':
                // Down pressed
                break
        }
    }

    useEffect(() => {
        checkAccounts()
        document.addEventListener('keydown', navigate)
        // return () => document.removeEventListener('keydown', navigate, true) // Succeeds
    }, [])

    useEffect(() => {
        if (accountLoaded) {
            setStep(6)
        }
    }, [accountLoaded])

    return tempScreens[step] || <div>failed</div>
}

const mapStateToProps = (store: { app: AppState }) => ({
    accountLoaded: store.app.accountLoaded,
})

export default connect(mapStateToProps, { checkAccounts })(App)
