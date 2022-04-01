import * as React from 'react'
import { useIntl } from 'react-intl'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import { CopyButton } from '@popup/components/CopyButton'
import Input from '@popup/components/Input'
import { AccountsList } from '@popup/components/AccountsManagement/components'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { CopyText } from '@popup/components/CopyText'

export function ManageDerivedKey(): JSX.Element {
    const intl = useIntl()
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
                <h2 className="accounts-management__header-title">
                    {intl.formatMessage({ id: 'MANAGE_DERIVED_KEY_PANEL_HEADER' })}
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <div className="accounts-management__content">
                    {accountability.currentDerivedKey !== undefined && (
                        <>
                            <div className="accounts-management__content-header">
                                {intl.formatMessage({ id: 'MANAGE_DERIVED_KEY_PLACEHOLDER_LABEL' })}
                            </div>

                            <div className="accounts-management__public-key-placeholder">
                                <CopyText
                                    id="copy-placeholder"
                                    text={accountability.currentDerivedKey.publicKey}
                                />
                            </div>
                        </>
                    )}

                    <div className="accounts-management__content-header">
                        {intl.formatMessage({ id: 'MANAGE_DERIVED_KEY_FIELD_NAME_LABEL' })}
                    </div>
                    <div className="accounts-management__name-field">
                        <Input
                            name="seed_name"
                            label={intl.formatMessage({
                                id: 'ENTER_DERIVED_KEY_NAME_FIELD_PLACEHOLDER',
                            })}
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
                                    {intl.formatMessage({ id: 'SAVE_BTN_TEXT' })}
                                </a>
                            )}
                    </div>

                    <div className="accounts-management__content-header--lead">
                        {intl.formatMessage({ id: 'MANAGE_DERIVED_KEY_LISTS_ACCOUNTS_HEADER' })}
                        <a
                            role="button"
                            className="accounts-management__create-account"
                            onClick={addAccount}
                        >
                            {intl.formatMessage({
                                id: 'MANAGE_DERIVED_KEY_LISTS_ACCOUNTS_ADD_NEW_LINK_TEXT',
                            })}
                        </a>
                    </div>

                    <div className="accounts-management__content-header">
                        {intl.formatMessage({
                            id: 'MANAGE_DERIVED_KEY_LIST_MY_ACCOUNTS_HEADING',
                        })}
                    </div>
                    <div className="accounts-management__divider" />

                    {accountability.currentDerivedKeyAccounts.length === 0 ? (
                        <div className="accounts-management__list--empty">
                            {intl.formatMessage({
                                id: 'MANAGE_DERIVED_KEY_LIST_NO_ACCOUNTS',
                            })}
                        </div>
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
                                {intl.formatMessage({
                                    id: 'MANAGE_DERIVED_KEY_LIST_EXTERNAL_ACCOUNTS_HEADING',
                                })}
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
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            white
                            onClick={onBack}
                        />
                    </div>

                    {accountability.currentDerivedKey !== undefined && (
                        <CopyButton
                            id="pubkey-copy-button"
                            text={accountability.currentDerivedKey.publicKey}
                        >
                            <Button
                                text={intl.formatMessage({ id: 'COPY_DERIVED_KEY_BTN_TEXT' })}
                            />
                        </CopyButton>
                    )}
                </footer>
            </div>
        </div>
    )
}
