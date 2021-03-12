import React, { useState } from 'react'
import ReactDOM from 'react-dom'

import WelcomeScreen from '../pages/WelcomeScreen/WelcomeScreen'
import PolicySignScreen from '../pages/PolicySignScreen/PolicySignScreen'
import GenerateSeedScreen, { CheckSeed } from '../pages/GenerateSeed/GenerateSeedScreen'
import CreatePasswordScreen, {
    ConfirmPasswordScreen,
} from '../pages/CreatePassword/CreatePasswordScreen'
import '../styles/main.scss'

const tempScreens = [
    <WelcomeScreen />,
    <PolicySignScreen />,
    <GenerateSeedScreen />,
    <CheckSeed />,
    <CreatePasswordScreen />,
    <ConfirmPasswordScreen />,
]

const App: React.FC = () => {
    const [step, setStep] = useState(5)
    return tempScreens[step]
}

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
)
