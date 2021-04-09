import React from 'react'
import SittingMan from '../../img/welcome.svg'
import { Button } from '../../components/button'
import './welcome-page.scss'

interface IWelcomeScreen {
    setStep: (arg0: number) => void
}

const WelcomeScreen: React.FC<IWelcomeScreen> = ({ setStep }) => (
    <>
        <div className="welcome-page__bg"></div>
        <div className="welcome-page__content">
            <div>
                <h1 className="welcome-page__content-header-xl">Welcome to Crystal Wallet</h1>
                <h3 className="welcome-page__content-header-s">Create a new wallet or sign in</h3>
                <SittingMan />
            </div>
            <div>
                <div className="welcome-page__content-button">
                    <Button text="Create a new wallet" onClick={() => setStep(1)} />
                </div>
                <Button
                    text="Sign in with seed phrase"
                    white
                    onClick={() => setStep(7)}
                />
            </div>
        </div>
    </>
)

export default WelcomeScreen
