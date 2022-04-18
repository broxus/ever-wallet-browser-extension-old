import * as React from 'react'
import { useIntl } from 'react-intl'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import NewAccountPage from '@popup/pages/NewAccountPage'
import ImportAccountPage from '@popup/pages/ImportAccountPage'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { KeyToRemove, MasterKeyToCreate } from '@shared/backgroundApi'
import LedgerSignIn from '@popup/components/Ledger/SignIn'
import { parseError } from '@popup/utils'

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
    // const [checked, setChecked] = React.useState(false)

    const createAccount = (params: nt.AccountToAdd) => rpc.createAccount(params)
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
                window.close()
            })
            .catch((e) => {
                setRestoreError(parseError(e))
            })
            .finally(() => setRestoreInProcess(false))
    }

    const setEnglishLocale = async () => {
        try {
            await rpc.setLocale('en')
        } catch (e) {}
    }

    const setKoreanLocale = async () => {
        try {
            await rpc.setLocale('ko')
        } catch (e) {}
    }

    console.log(rpcState.state.selectedLocale)

    if (rpcState.state.selectedLocale === undefined) {
        return (
            <div className="welcome-page">
                <div className="welcome-page__content">
                    <div>
                        <div className="welcome-page__content-button">
                            <Button text="English" onClick={setEnglishLocale} />
                        </div>
                        <div className="welcome-page__content-button">
                            <Button text="한국어" white onClick={setKoreanLocale} />
                        </div>
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
                        {/*<div className="welcome-page__content-checkbox">*/}
                        {/*    <Checkbox checked={checked} onChange={setChecked} />*/}
                        {/*    <span className="welcome-page__content-checkbox-label">*/}
                        {/*        I Agree to&nbsp;*/}
                        {/*        <a*/}
                        {/*            className="welcome-page__content-checkbox-label--link"*/}
                        {/*            href="https://l1.broxus.com/everscale/wallet/privacy"*/}
                        {/*            target="_blank"*/}
                        {/*        >*/}
                        {/*            Privacy Policy*/}
                        {/*        </a>*/}
                        {/*    </span>*/}
                        {/*</div>*/}
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
