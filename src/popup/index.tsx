import React, { useState } from 'react'
import ReactDOM from 'react-dom'

import WelcomeScreen from '../pages/WelcomeScreen/WelcomeScreen'
import PolicySignScreen from '../pages/PolicySignScreen/PolicySignScreen'
import '../styles/main.scss'

const tempScreens = [<WelcomeScreen />, <PolicySignScreen />]

const App: React.FC = () => {
    const [step, setStep] = useState(1)
    return tempScreens[step]
}

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
)
