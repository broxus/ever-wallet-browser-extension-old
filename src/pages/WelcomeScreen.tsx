import React from 'react'
import { ReactComponent as SittingMan } from '../img/welcome.svg'
import { Button } from '../components/button'
import './welcome-page.scss'

const WelcomeScreen = () => (
    <>
        <div className="welcome-page__bg"></div>
        <div className="welcome-page__content">
            <div>
                <h1 className="welcome-page__header-xl">Welcome to Crystal Wallet</h1>
                <h3 className="welcome-page__header-s">Create a new wallet or sign in</h3>
                <SittingMan className="welcome-page__illustration" />
            </div>
            <div>
                <div className="welcome-page__button">
                    <Button text="Create a new wallet" />
                </div>
                <Button text="Sign in with seed phrase or private key" white />
            </div>
        </div>
    </>
)

export default WelcomeScreen
