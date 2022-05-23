import * as React from 'react'
import { useIntl } from 'react-intl'
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
import LedgerAccountManager from '@popup/components/Ledger/AccountManager'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { Switcher } from '@popup/components/Switcher'

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
    const intl = useIntl()
    const [backupInProgress, setBackupInProgress] = React.useState(false)
    const [passwordsCacheInProgress, setPasswordsCacheInProgress] = React.useState(false)

    const accountability = useAccountability()
    const rpc = useRpc()
    const rpcState = useRpcState()
    const signerName = accountability.currentMasterKey?.signerName

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

    const backToManageSeed = () => {
        accountability.setStep(Step.MANAGE_SEED)
    }

    const onBackup = () => {
        if (backupInProgress) {
            return
        }

        setBackupInProgress(true)
        rpc.exportStorage()
            .then((storage) => {
                downloadFileAsText(storage)
            })
            .finally(() => setBackupInProgress(false))
    }

    const togglePasswordsCache = () => {
        if (passwordsCacheInProgress) {
            return
        }

        setPasswordsCacheInProgress(true)
        rpc.setPasswordsCacheEnabled(!rpcState.state.passwordsCacheEnabled).finally(() =>
            setPasswordsCacheInProgress(false)
        )
    }

    return (
        <>
            {accountability.step == Step.MANAGE_SEEDS && (
                <div key="manageSeeds" className="accounts-management">
                    <header className="accounts-management__header">
                        <h2 className="accounts-management__header-title">
                            {intl.formatMessage({ id: 'MANAGE_SEEDS_PANEL_HEADER' })}
                        </h2>
                    </header>

                    <div className="accounts-management__wrapper">
                        <div className="accounts-management__content">
                            <div className="accounts-management__content-header">
                                {intl.formatMessage({ id: 'MANAGE_SEEDS_LIST_HEADING' })}
                                <a role="button" className="extra" onClick={addSeed}>
                                    {intl.formatMessage({
                                        id: 'MANAGE_SEEDS_LIST_ADD_NEW_LINK_TEXT',
                                    })}
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
                                                    {isActive &&
                                                        intl.formatMessage({
                                                            id: 'MANAGE_SEEDS_LIST_ITEM_CURRENT',
                                                        })}
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

                        <footer className="accounts-management__footer accounts-management__footer--vertical">
                            <div
                                className={classNames('accounts-management__passwords-cache', {
                                    'accounts-management__passwords-cache-disabled':
                                        passwordsCacheInProgress,
                                })}
                            >
                                <Switcher
                                    id="visibility"
                                    checked={rpcState.state.passwordsCacheEnabled}
                                    onChange={togglePasswordsCache}
                                />
                                <label htmlFor="visibility">
                                    {intl.formatMessage({
                                        id: 'MANAGE_SEEDS_PASSWORDS_CACHE_SWITCHER_LABEL',
                                    })}
                                </label>
                            </div>

                            <Button
                                text={intl.formatMessage({
                                    id: 'BACKUP_ALL_BTN_TEXT',
                                })}
                                onClick={onBackup}
                                disabled={backupInProgress}
                            />
                        </footer>
                    </div>
                </div>
            )}

            {accountability.step === Step.CREATE_SEED && <CreateSeed key="createSeed" />}

            {accountability.step === Step.MANAGE_SEED && <ManageSeed key="manageSeed" />}

            {accountability.step === Step.CREATE_DERIVED_KEY && signerName !== 'ledger_key' && (
                <CreateDerivedKey key="createDerivedKey" />
            )}

            {accountability.step === Step.CREATE_DERIVED_KEY && signerName === 'ledger_key' && (
                <LedgerAccountManager onBack={backToManageSeed} />
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
