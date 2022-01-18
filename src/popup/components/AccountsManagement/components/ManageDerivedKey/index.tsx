import * as React from 'react'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import { CopyButton } from '@popup/components/CopyButton'
import Input from '@popup/components/Input'
import { AccountsList } from '@popup/components/AccountsManagement/components'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { CopyText } from '@popup/components/CopyText'

export function ManageDerivedKey(): JSX.Element {
    const accountability = useAccountability()
    const rpc = useRpc()

    const [name, setName] = React.useState(accountability.currentDerivedKey?.name || '')

    const addAccount = () => {
        accountability.setStep(Step.CREATE_ACCOUNT)
    }

    const saveName = async () => {
        if (accountability.currentDerivedKey !== undefined && name) {
            await rpc.updateDerivedKeyName({
                ...accountability.currentDerivedKey,
                name,
            })
            accountability.setCurrentDerivedKey({
                ...accountability.currentDerivedKey,
                name,
            })
        }
    }

    const onManageAccount = (account: nt.AssetsList) => {
        accountability.onManageAccount(account)
    }

    const onBack = () => {
        accountability.setStep(Step.MANAGE_SEED)
        accountability.setCurrentDerivedKey(undefined)
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">Manage key</h2>
            </header>

            <div className="accounts-management__wrapper">
                <div className="accounts-management__content">
                    {accountability.currentDerivedKey !== undefined && (
                        <>
                            <div className="accounts-management__content-header">Public key</div>

                            <div className="accounts-management__public-key-placeholder">
                                <CopyText
                                    id="copy-placeholder"
                                    text={accountability.currentDerivedKey.publicKey}
                                />
                            </div>
                        </>
                    )}

                    <div className="accounts-management__content-header">Key name</div>
                    <div className="accounts-management__name-field">
                        <Input
                            name="seed_name"
                            label="Enter key name"
                            type="text"
                            autocomplete="off"
                            value={name || ''}
                            onChange={(e) => setName(e.target.value)}
                        />
                        {accountability.currentDerivedKey !== undefined &&
                            (accountability.currentDerivedKey.name !== undefined || name) &&
                            accountability.currentDerivedKey.name !== name && (
                                <a
                                    role="button"
                                    className="accounts-management__name-button"
                                    onClick={saveName}
                                >
                                    Save
                                </a>
                            )}
                    </div>

                    <div className="accounts-management__content-header--lead">
                        Accounts
                        <a
                            role="button"
                            className="accounts-management__create-account"
                            onClick={addAccount}
                        >
                            + Add new
                        </a>
                    </div>

                    <div className="accounts-management__content-header">My accounts</div>
                    <div className="accounts-management__divider" />

                    {accountability.currentDerivedKeyAccounts.length === 0 ? (
                        <div className="accounts-management__list--empty">No accounts yet</div>
                    ) : (
                        <AccountsList
                            items={accountability.currentDerivedKeyAccounts}
                            onClick={onManageAccount}
                        />
                    )}

                    {accountability.currentDerivedKeyExternalAccounts.length > 0 ? (
                        <>
                            <div
                                className="accounts-management__content-header"
                                style={{ marginTop: 20 }}
                            >
                                External accounts
                            </div>
                            <div className="accounts-management__divider" />

                            <AccountsList
                                items={accountability.currentDerivedKeyExternalAccounts}
                                onClick={onManageAccount}
                            />
                        </>
                    ) : null}
                </div>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button text="Back" white onClick={onBack} />
                    </div>

                    {accountability.currentDerivedKey !== undefined && (
                        <CopyButton
                            id="pubkey-copy-button"
                            text={accountability.currentDerivedKey.publicKey}
                        >
                            <Button text="Copy public key" />
                        </CopyButton>
                    )}
                </footer>
            </div>
        </div>
    )
}
