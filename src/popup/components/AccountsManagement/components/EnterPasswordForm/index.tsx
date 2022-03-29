import * as React from 'react'
import { useIntl } from 'react-intl'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'

interface IEnterPasswordForm {
    title: string
    error?: string
    inProcess?: boolean
    onSubmit: (password: string) => void
    onBack: () => void
}

export function EnterPasswordForm({
    title,
    error,
    inProcess,
    onSubmit,
    onBack,
}: IEnterPasswordForm): JSX.Element {
    const intl = useIntl()
    const { register, handleSubmit, formState } = useForm<{
        password: string
    }>()

    const submit = ({ password }: { password: string }) => {
        onSubmit(password)
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">{title}</h2>
            </header>

            <div className="accounts-management__wrapper">
                <form onSubmit={handleSubmit(submit)}>
                    <div className="accounts-management__content-form-rows">
                        <div className="accounts-management__content-form-row">
                            <Input
                                autoFocus
                                {...register('password', {
                                    required: true,
                                    minLength: 6,
                                })}
                                disabled={inProcess}
                                label={intl.formatMessage({
                                    id: 'ENTER_SEED_PASSWORD_FIELD_PLACEHOLDER',
                                })}
                                type="password"
                            />
                            {(formState.errors.password || error) && (
                                <div className="accounts-management__content-error">
                                    {formState.errors.password &&
                                        intl.formatMessage({
                                            id: 'ERROR_PASSWORD_IS_REQUIRED_FIELD',
                                        })}
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            disabled={inProcess}
                            white
                            onClick={onBack}
                        />
                    </div>
                    <Button
                        text={intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })}
                        disabled={inProcess}
                        onClick={handleSubmit(submit)}
                    />
                </footer>
            </div>
        </div>
    )
}
