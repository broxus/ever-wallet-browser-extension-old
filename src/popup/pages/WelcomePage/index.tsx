import * as React from 'react'
import { useIntl } from 'react-intl'

import Button from '@popup/components/Button'
import NewAccountPage from '@popup/pages/NewAccountPage'
import ImportAccountPage from '@popup/pages/ImportAccountPage'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import LedgerSignIn from '@popup/components/Ledger/SignIn'
import { parseError } from '@popup/utils'
import { LOCALES } from '@shared/constants'

import SittingMan from '@popup/img/welcome.svg'

import './style.scss'

enum Step {
    WELCOME,
    CREATE_ACCOUNT,
    IMPORT_ACCOUNT,
    LEDGER_ACCOUNT,
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
    const intl = useIntl()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [localStep, setStep] = React.useState(Step.WELCOME)
    const [restoreInProcess, setRestoreInProcess] = React.useState(false)
    const [restoreError, setRestoreError] = React.useState<string | undefined>()

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
                window.close()
            })
            .catch((e) => {
                setRestoreError(parseError(e))
            })
            .finally(() => setRestoreInProcess(false))
    }

    const setLocale = (locale: string) => async () => {
        try {
            await rpc.setLocale(locale)
        } catch (e) {}
    }

    if (rpcState.state.selectedLocale === undefined) {
        return (
            <div className="welcome-page">
                <div className="welcome-page__content">
                    <div>
                        {LOCALES.map(({ name, title }) => (
                            <div className="welcome-page__content-button">
                                <Button text={title} onClick={setLocale(name)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {localStep == Step.WELCOME && (
                <div className="welcome-page">
                    <div className="welcome-page__content">
                        <div>
                            <h1 className="welcome-page__content-header-xl">
                                {intl.formatMessage({
                                    id: 'WELCOME_TO_EVER_WALLET',
                                })}
                            </h1>
                            <img src={SittingMan} alt="" />
                        </div>
                        <br />
                        <div>
                            <div className="welcome-page__content-button">
                                <Button
                                    text={intl.formatMessage({
                                        id: 'CREATE_A_NEW_WALLET',
                                    })}
                                    onClick={() => {
                                        setStep(Step.CREATE_ACCOUNT)
                                    }}
                                />
                            </div>
                            <div className="welcome-page__content-button">
                                <Button
                                    text={intl.formatMessage({
                                        id: 'SIGN_IN_WITH_SEED_PHRASE',
                                    })}
                                    white
                                    onClick={() => {
                                        setStep(Step.IMPORT_ACCOUNT)
                                    }}
                                />
                            </div>
                            <div className="welcome-page__content-button">
                                <Button
                                    text={intl.formatMessage({
                                        id: 'SIGN_IN_WITH_LEDGER',
                                    })}
                                    white
                                    onClick={() => {
                                        setStep(Step.LEDGER_ACCOUNT)
                                    }}
                                />
                            </div>
                            <hr />
                            <Button
                                text={intl.formatMessage({
                                    id: 'RESTORE_FROM_BACKUP',
                                })}
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
                    onBack={() => {
                        setStep(Step.WELCOME)
                    }}
                />
            )}

            {localStep == Step.IMPORT_ACCOUNT && (
                <ImportAccountPage
                    name={FIRST_ACCOUNT_NAME}
                    onBack={() => {
                        setStep(Step.WELCOME)
                    }}
                />
            )}

            {localStep == Step.LEDGER_ACCOUNT && (
                <LedgerSignIn
                    onBack={() => {
                        setStep(Step.WELCOME)
                    }}
                />
            )}
        </>
    )
}
