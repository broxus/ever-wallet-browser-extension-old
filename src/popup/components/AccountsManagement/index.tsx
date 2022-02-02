import * as React from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import {
    CreateAccount,
    CreateDerivedKey,
    CreateSeed,
    ManageAccount,
    ManageDerivedKey,
    ManageSeed,
} from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { convertAddress } from '@shared/utils'

import Arrow from '@popup/img/arrow.svg'
import TonLogo from '@popup/img/ton-logo.svg'

import './style.scss'

const downloadFileAsText = (text: string) => {
    const a = window.document.createElement('a')
    a.href = window.URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    a.download = 'ever-wallet-backup.json'

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export function ManageSeeds(): JSX.Element {
    const [inProgress, setInProgress] = React.useState(false)

    const accountability = useAccountability()
    const rpc = useRpc()

    const onManageMasterKey = (seed: nt.KeyStoreEntry) => {
        return () => accountability.onManageMasterKey(seed)
    }

    const addSeed = () => {
        accountability.reset()
        accountability.setStep(Step.CREATE_SEED)
    }

    const onBackInCreateAccountIndex = () => {
        accountability.setStep(Step.MANAGE_DERIVED_KEY)
    }

    const onBackup = () => {
        setInProgress(true)
        rpc.exportStorage()
            .then((storage) => {
                downloadFileAsText(storage)
            })
            .finally(() => setInProgress(false))
    }

    return (
        <>
            {accountability.step == Step.MANAGE_SEEDS && (
                <div key="manageSeeds" className="accounts-management">
                    <header className="accounts-management__header">
                        <h2 className="accounts-management__header-title">Manage seed phrases</h2>
                    </header>

                    <div className="accounts-management__wrapper">
                        <div className="accounts-management__content">
                            <div className="accounts-management__content-header">
                                Seed phrases
                                <a role="button" className="extra" onClick={addSeed}>
                                    + Add new
                                </a>
                            </div>

                            <div className="accounts-management__divider" />

                            <ul className="accounts-management__list">
                                {accountability.masterKeys.map((key) => {
                                    const isActive =
                                        accountability.selectedMasterKey === key.masterKey
                                    return (
                                        <li key={key.masterKey}>
                                            <div
                                                role="button"
                                                className={classNames(
                                                    'accounts-management__list-item',
                                                    {
                                                        'accounts-management__list-item--active':
                                                            isActive,
                                                    }
                                                )}
                                                onClick={onManageMasterKey(key)}
                                            >
                                                <img
                                                    src={TonLogo}
                                                    alt=""
                                                    className="accounts-management__list-item-logo"
                                                />
                                                <div className="accounts-management__list-item-title">
                                                    {accountability.masterKeysNames[
                                                        key.masterKey
                                                    ] || convertAddress(key.masterKey)}
                                                    {isActive && ' (current)'}
                                                </div>
                                                <img
                                                    src={Arrow}
                                                    alt=""
                                                    style={{ height: 24, width: 24 }}
                                                />
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>

                        <footer className="accounts-management__footer">
                            <Button text="Backup all" onClick={onBackup} disabled={inProgress} />
                        </footer>
                    </div>
                </div>
            )}

            {accountability.step === Step.CREATE_SEED && <CreateSeed key="createSeed" />}

            {accountability.step === Step.MANAGE_SEED && <ManageSeed key="manageSeed" />}

            {accountability.step === Step.CREATE_DERIVED_KEY && (
                <CreateDerivedKey key="createDerivedKey" />
            )}

            {accountability.step === Step.MANAGE_DERIVED_KEY && (
                <ManageDerivedKey key="manageDerivedKey" />
            )}

            {accountability.step === Step.CREATE_ACCOUNT && (
                <CreateAccount key="createAccount" onBackFromIndex={onBackInCreateAccountIndex} />
            )}

            {accountability.step === Step.MANAGE_ACCOUNT && <ManageAccount key="manageAccount" />}
        </>
    )
}
