import * as React from 'react'
import { useIntl } from 'react-intl'
import classNames from 'classnames'

import Button from '@popup/components/Button'
import { Select } from '@popup/components/Select'
import { AddAccountFlow } from '@popup/components/AccountsManagement/components'
import { useAccountability } from '@popup/providers/AccountabilityProvider'

const CreateAccountIcon = ({ className }: { className?: string }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className={className}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 0H8V8H0V10H8V18H10V10H18V8H10V0Z"
                fill="currentColor"
            />
        </svg>
    )
}

const ExternalAccountIcon = ({ className }: { className?: string }) => {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={classNames(className, 'hover-stoke')}
        >
            <path
                d="M17 4L10 11M17 4V8M17 4H13M15 11V17H4V6H10"
                stroke="currentColor"
                strokeWidth="1.6"
            />
        </svg>
    )
}

type Props = {
    flow: AddAccountFlow
    onSelect(flow: AddAccountFlow): void
    onNext(): void
    onBack?(): void
}

export function SelectAccountAddingFlow({ flow, onSelect, onNext, onBack }: Props): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()

    const derivedKeys = React.useMemo(
        () =>
            accountability.derivedKeys.sort(
                (a, b) => a.accountId - b.accountId
            ) /*.map((key) => ({ label: key.name, value: key }))*/,
        [accountability.derivedKeys]
    )

    const derivedKeysOptions = React.useMemo(
        () =>
            derivedKeys.map((key) => ({
                label: key.name,
                value: key.publicKey,
                ...key,
            })),
        [derivedKeys]
    )

    const onChangeDerivedKey = (value: string, option: any) => {
        if (value != null) {
            accountability.setCurrentDerivedKey(option)
        }
    }

    const onChangeFlow = (flow: AddAccountFlow) => {
        return () => {
            onSelect(flow)
        }
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">
                    {intl.formatMessage({ id: 'ADD_ACCOUNT_PANEL_HEADER' })}
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <div className="accounts-management__content">
                    <div className="accounts-management__content-form-rows">
                        <div className="accounts-management__content-form-row">
                            <Select
                                options={derivedKeysOptions}
                                value={
                                    accountability.currentDerivedKey?.publicKey ||
                                    accountability.derivedKeys[0]?.publicKey
                                }
                                getPopupContainer={(trigger) =>
                                    trigger.closest('.sliding-panel__content') ||
                                    document.getElementById('root') ||
                                    document.body
                                }
                                onChange={onChangeDerivedKey}
                            />
                        </div>
                    </div>

                    <div className="accounts-management__add-options">
                        <div
                            className={classNames('accounts-management__add-options-option', {
                                'accounts-management__add-options-option-selected':
                                    flow === AddAccountFlow.CREATE,
                            })}
                            onClick={onChangeFlow(AddAccountFlow.CREATE)}
                        >
                            <CreateAccountIcon className="accounts-management__add-options-icon" />
                            {intl.formatMessage({ id: 'ADD_ACCOUNT_PANEL_FLOW_CREATE_LABEL' })}
                        </div>
                        <div
                            className={classNames('accounts-management__add-options-option', {
                                'accounts-management__add-options-option-selected':
                                    flow === AddAccountFlow.IMPORT,
                            })}
                            onClick={onChangeFlow(AddAccountFlow.IMPORT)}
                        >
                            <ExternalAccountIcon className="accounts-management__add-options-icon" />
                            {intl.formatMessage({
                                id: 'ADD_ACCOUNT_PANEL_FLOW_ADD_EXTERNAL_LABEL',
                            })}
                        </div>
                    </div>
                </div>

                <footer className="accounts-management__footer">
                    {typeof onBack === 'function' && (
                        <div className="accounts-management__footer-button-back">
                            <Button
                                text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                                white
                                onClick={onBack}
                            />
                        </div>
                    )}
                    <Button text={intl.formatMessage({ id: 'NEXT_BTN_TEXT' })} onClick={onNext} />
                </footer>
            </div>
        </div>
    )
}
