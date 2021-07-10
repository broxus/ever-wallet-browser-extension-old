import * as React from 'react'

import Button from '@popup/components/Button'
import NewAccountPage from '@popup/pages/NewAccountPage'
import RestoreAccountPage from '@popup/pages/RestoreAccountPage'
import { useRpc } from '@popup/providers/RpcProvider'
import { AccountToCreate, KeyToRemove, MasterKeyToCreate } from '@shared/backgroundApi'

import SittingMan from '@popup/img/welcome.svg'

import './style.scss'

enum Step {
    WELCOME,
    CREATE_ACCOUNT,
    RESTORE_ACCOUNT,
}

const FIRST_ACCOUNT_NAME = 'Account 1'

export function WelcomePage(): JSX.Element {
    const rpc = useRpc()

    const [localStep, setStep] = React.useState(Step.WELCOME)

    const createAccount = (params: AccountToCreate) => rpc.createAccount(params)
    const createMasterKey = (params: MasterKeyToCreate) => rpc.createMasterKey(params)
    const removeKey = (params: KeyToRemove) => rpc.removeKey(params)

    return (
        <>
            {localStep == Step.WELCOME && (
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
                            <img src={SittingMan} alt="" />
                        </div>
                        <div>
                            <div className="welcome-page__content-button">
                                <Button
                                    text="Create a new wallet"
                                    onClick={() => {
                                        setStep(Step.CREATE_ACCOUNT)
                                    }}
                                />
                            </div>
                            <Button
                                text="Sign in with seed phrase"
                                white
                                onClick={() => {
                                    setStep(Step.RESTORE_ACCOUNT)
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {localStep == Step.CREATE_ACCOUNT && (
                <NewAccountPage
                    name={FIRST_ACCOUNT_NAME}
                    createAccount={createAccount}
                    createMasterKey={createMasterKey}
                    removeKey={removeKey}
                    onBack={() => {
                        setStep(Step.WELCOME)
                    }}
                />
            )}

            {localStep == Step.RESTORE_ACCOUNT && (
                <RestoreAccountPage
                    name={FIRST_ACCOUNT_NAME}
                    createAccount={createAccount}
                    createMasterKey={createMasterKey}
                    removeKey={removeKey}
                    onBack={() => {
                        setStep(Step.WELCOME)
                    }}
                />
            )}
        </>
    )
}
