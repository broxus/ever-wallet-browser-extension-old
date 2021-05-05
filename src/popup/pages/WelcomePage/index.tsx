import React, { useState } from 'react'
import { AccountToCreate } from '@shared/approvalApi'

import Button from '@popup/components/Button'
import NewAccountPage from '@popup/pages/NewAccountPage'
import RestoreAccountPage from '@popup/pages/RestoreAccountPage'

import SittingMan from '@popup/img/welcome.svg'

import './style.scss'

enum LocalStep {
    WELCOME,
    CREATE_ACCOUNT,
    RESTORE_ACCOUNT,
}

interface IWelcomePage {
    createAccount: (params: AccountToCreate) => Promise<any>
}

const WelcomePage: React.FC<IWelcomePage> = ({ createAccount }) => {
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.WELCOME)

    const FIRST_ACCOUNT_NAME = 'Account 1'

    return (
        <>
            {localStep == LocalStep.WELCOME && (
                <div className="welcome-page">
                    <div className="welcome-page__bg" />
                    <div className="welcome-page__content">
                        <div>
                            <h1 className="welcome-page__content-header-xl">
                                Welcome to Crystal Wallet
                            </h1>
                            <h3 className="welcome-page__content-header-s">
                                Create a new wallet or sign in
                            </h3>
                            <SittingMan />
                        </div>
                        <div>
                            <div className="welcome-page__content-button">
                                <Button
                                    text="Create a new wallet"
                                    onClick={() => {
                                        setLocalStep(LocalStep.CREATE_ACCOUNT)
                                    }}
                                />
                            </div>
                            <Button
                                text="Sign in with seed phrase"
                                white
                                onClick={() => {
                                    setLocalStep(LocalStep.RESTORE_ACCOUNT)
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {localStep == LocalStep.CREATE_ACCOUNT && (
                <NewAccountPage
                    name={FIRST_ACCOUNT_NAME}
                    createAccount={createAccount}
                    onBack={() => {
                        setLocalStep(LocalStep.WELCOME)
                    }}
                />
            )}
            {localStep == LocalStep.RESTORE_ACCOUNT && (
                <RestoreAccountPage
                    name={FIRST_ACCOUNT_NAME}
                    createAccount={createAccount}
                    onBack={() => {
                        setLocalStep(LocalStep.WELCOME)
                    }}
                />
            )}
        </>
    )
}

export default WelcomePage
