import * as React from 'react'

import Button from '@popup/components/Button'
import NewAccountPage from '@popup/pages/NewAccountPage'
import ImportAccountPage from '@popup/pages/ImportAccountPage'
import { useRpc } from '@popup/providers/RpcProvider'
import { AccountToCreate, KeyToRemove, MasterKeyToCreate } from '@shared/backgroundApi'

import SittingMan from '@popup/img/welcome.svg'

import './style.scss'
import { parseError } from '@popup/utils'

enum Step {
    WELCOME,
    CREATE_ACCOUNT,
    IMPORT_ACCOUNT,
}

const FIRST_ACCOUNT_NAME = 'Account 1'

const updateFile = (): Promise<File | undefined> => {
    let lock = false
    return new Promise<File | undefined>((resolve) => {
        // create input file
        const input = document.createElement('input')
        input.id = (+new Date()).toString()
        input.style.display = 'none'
        input.setAttribute('type', 'file')
        document.body.appendChild(input)

        input.addEventListener(
            'change',
            () => {
                lock = true
                const file = input.files?.[0]
                resolve(file)
                // remove dom
                const fileInput = document.getElementById(input.id)
                fileInput && document.body.removeChild(fileInput)
            },
            { once: true }
        )

        // file blur
        window.addEventListener(
            'focus',
            () => {
                setTimeout(() => {
                    if (!lock && document.getElementById(input.id)) {
                        resolve(undefined)
                        // remove dom
                        const fileInput = document.getElementById(input.id)
                        fileInput && document.body.removeChild(fileInput)
                    }
                }, 300)
            },
            { once: true }
        )

        // open file select box
        input.click()
    })
}

export function WelcomePage(): JSX.Element {
    const rpc = useRpc()

    const [localStep, setStep] = React.useState(Step.WELCOME)
    const [restoreInProcess, setRestoreInProcess] = React.useState(false)
    const [restoreError, setRestoreError] = React.useState<string | undefined>()

    const createAccount = (params: AccountToCreate) => rpc.createAccount(params)
    const createMasterKey = (params: MasterKeyToCreate) => rpc.createMasterKey(params)
    const removeKey = (params: KeyToRemove) => rpc.removeKey(params)

    const restoreFromBackup = () => {
        if (restoreInProcess) {
            return
        }
        setRestoreInProcess(true)
        updateFile()
            .then(
                (file): Promise<string | undefined> =>
                    new Promise<string | undefined>((resolve, reject) => {
                        if (file == null) {
                            return resolve(undefined)
                        }

                        const reader = new FileReader()
                        reader.onload = (event) => {
                            resolve(event.target?.result as string | undefined)
                        }
                        reader.onerror = (_error) => {
                            reject(reader.error)
                        }
                        reader.readAsText(file)
                    })
            )
            .then(async (file) => {
                if (file == null) {
                    return
                }
                if (!(await rpc.importStorage(file))) {
                    throw new Error('Failed to import storage')
                }
            })
            .catch((e) => {
                setRestoreError(parseError(e))
            })
            .finally(() => setRestoreInProcess(false))
    }

    return (
        <>
            {localStep == Step.WELCOME && (
                <div className="welcome-page">
                    <div className="welcome-page__content">
                        <div>
                            <h1 className="welcome-page__content-header-xl">
                                Welcome to EVER Wallet
                            </h1>
                            <img src={SittingMan} alt="" />
                        </div>
                        <br />
                        <div>
                            <div className="welcome-page__content-button">
                                <Button
                                    text="Create a new wallet"
                                    onClick={() => {
                                        setStep(Step.CREATE_ACCOUNT)
                                    }}
                                />
                            </div>
                            <div className="welcome-page__content-button">
                                <Button
                                    text="Sign in with seed phrase"
                                    white
                                    onClick={() => {
                                        setStep(Step.IMPORT_ACCOUNT)
                                    }}
                                />
                            </div>
                            <hr />
                            <Button
                                text="Restore from backup"
                                white
                                disabled={restoreInProcess}
                                onClick={restoreFromBackup}
                            />
                            {restoreError && (
                                <div className="check-seed__content-error">{restoreError}</div>
                            )}
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

            {localStep == Step.IMPORT_ACCOUNT && (
                <ImportAccountPage
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
