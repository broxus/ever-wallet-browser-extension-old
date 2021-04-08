import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import WelcomeScreen from './pages/WelcomeScreen/WelcomeScreen'
import PolicySignScreen from './pages/PolicySignScreen/PolicySignScreen'
import GenerateSeedScreen, { CheckSeed } from './pages/GenerateSeed/GenerateSeedScreen'
import CreatePasswordScreen, {
    ConfirmPasswordScreen,
} from './pages/CreatePassword/CreatePasswordScreen'
import MainPageScreen from './pages/MainPage/MainPageScreen'
import CreateAccountScreen from './pages/CreateAccount/CreateAccountScreen'
import store from './store/index'
import init from '../../nekoton/pkg'
import { Provider } from 'react-redux'
import SelectWallet from './pages/SelectWallet/SelectWallet'
import './styles/main.scss'

const tempScreens = [
    <WelcomeScreen />,
    <PolicySignScreen />,
    <GenerateSeedScreen />,
    <CheckSeed />,
    <CreatePasswordScreen />,
    <ConfirmPasswordScreen />,
    <SelectWallet />,
    <MainPageScreen />,
    <CreateAccountScreen />,
]

const App: React.FC = () => {
    const [step, setStep] = useState(8)

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
        document.addEventListener('keydown', navigate)
        // return () => document.removeEventListener('keydown', navigate, true) // Succeeds
    }, [])

    return tempScreens[step] || <div>failed</div>
}
;(async () => {
    await init('index_bg.wasm')

    ReactDOM.render(
        <React.StrictMode>
            <Provider store={store}>
                <App />
            </Provider>
        </React.StrictMode>,
        document.getElementById('root')
    )
})()
