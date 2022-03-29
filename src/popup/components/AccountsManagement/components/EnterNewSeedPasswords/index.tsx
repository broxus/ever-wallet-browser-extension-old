import * as React from 'react'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { useIntl } from 'react-intl'

type Props = {
    disabled?: boolean
    error?: string
    onSubmit(password: string): void
    onBack(): void
}

export function EnterNewSeedPasswords({ disabled, error, onBack, ...props }: Props): JSX.Element {
    const intl = useIntl()
    const { register, handleSubmit, watch, formState } = useForm()

    const onSubmit = ({ password }: { password: string }) => {
        props.onSubmit(password)
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">
                    {intl.formatMessage({ id: 'IMPORT_SEED_PANEL_CONFIRM_HEADER' })}
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <form id="password" onSubmit={handleSubmit(onSubmit)}>
                    <div className="accounts-management__content-form-rows">
                        <div className="accounts-management__content-form-row">
                            <Input
                                {...register('password', {
                                    required: true,
                                    minLength: 6,
                                })}
                                disabled={disabled}
                                label={intl.formatMessage({ id: 'PASSWORD_FIELD_PLACEHOLDER' })}
                                autoFocus
                                type="password"
                            />
                            {formState.errors.password && (
                                <div className="accounts-management__content-error">
                                    {intl.formatMessage({ id: 'ERROR_PASSWORD_IS_REQUIRED' })}
                                </div>
                            )}
                        </div>

                        <div className="accounts-management__content-form-row">
                            <Input
                                {...register('passwordConfirm', {
                                    required: true,
                                    validate: (value) => value === watch('password'),
                                })}
                                disabled={disabled}
                                label={intl.formatMessage({
                                    id: 'PASSWORD_CONFIRM_FIELD_PLACEHOLDER',
                                })}
                                type="password"
                            />
                            {formState.errors.passwordConfirm && (
                                <div className="accounts-management__content-error">
                                    {intl.formatMessage({ id: 'ERROR_PASSWORD_DOES_NOT_MATCH' })}
                                </div>
                            )}
                        </div>
                    </div>
                    {error !== undefined && (
                        <div className="accounts-management__content-error">{error}</div>
                    )}
                </form>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            disabled={disabled}
                            white
                            onClick={onBack}
                        />
                    </div>
                    <Button
                        text={intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })}
                        disabled={disabled}
                        onClick={handleSubmit(onSubmit)}
                    />
                </footer>
            </div>
        </div>
    )
}
