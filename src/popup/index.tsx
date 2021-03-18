import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import WelcomeScreen from '../pages/WelcomeScreen/WelcomeScreen'
import PolicySignScreen from '../pages/PolicySignScreen/PolicySignScreen'
import GenerateSeedScreen, { CheckSeed } from '../pages/GenerateSeed/GenerateSeedScreen'
import CreatePasswordScreen, {
    ConfirmPasswordScreen,
} from '../pages/CreatePassword/CreatePasswordScreen'
import MainPageScreen from '../pages/MainPage/MainPageScreen'
import '../styles/main.scss'
import CreateAccountScreen from '../pages/CreateAccount/CreateAccountScreen'

const tempScreens = [
    <WelcomeScreen />,
    <PolicySignScreen />,
    <GenerateSeedScreen />,
    <CheckSeed />,
    <CreatePasswordScreen />,
    <ConfirmPasswordScreen />,
    <MainPageScreen />,
    <CreateAccountScreen />,
]

const App: React.FC = () => {
    const [step, setStep] = useState(6)

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

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
)
