import React from 'react'
import { useIntl } from 'react-intl'
import { useForm } from 'react-hook-form'

import Input from '@popup/components/Input'
import Button from '@popup/components/Button'

import './style.scss'

type IEnterPasswordScreen = {
    disabled: boolean
    onSubmit: (password: string) => void
    onBack: () => void
}

const EnterNewPassword: React.FC<IEnterPasswordScreen> = ({ disabled, onSubmit, onBack }) => {
    const intl = useIntl()
    const { register, handleSubmit, watch, formState } = useForm()

    const trySubmit = (data: any) => {
        !disabled && onSubmit(data.password)
    }

    return (
        <div className="enter-new-password">
            <div className="enter-new-password__content">
                <div className="enter-new-password__content-pwd-form">
                    <h2 className="enter-new-password__content-pwd-form-header">
                        {intl.formatMessage({ id: 'PASSWORD_PROTECTION' })}
                    </h2>
                    <h3 className="enter-new-password__content-pwd-form-comment">
                        {intl.formatMessage({ id: 'PASSWORD_PROTECTION_NOTE' })}
                    </h3>
                    <form
                        id="password"
                        onSubmit={handleSubmit(trySubmit)}
                        style={{ position: 'relative' }}
                    >
                        <Input
                            label={intl.formatMessage({ id: 'PASSWORD_FIELD_PLACEHOLDER' })}
                            autoFocus
                            disabled={disabled}
                            type={'password'}
                            {...register('password', {
                                required: true,
                                minLength: 6,
                            })}
                        />
                        <Input
                            label={intl.formatMessage({ id: 'PASSWORD_CONFIRM_FIELD_PLACEHOLDER' })}
                            type={'password'}
                            disabled={disabled}
                            {...register('passwordConfirm', {
                                required: true,
                                validate: (value) => value === watch('password'),
                            })}
                        />
                        {formState.errors.password && (
                            <div className="check-seed__content-error">
                                {intl.formatMessage({ id: 'ERROR_PASSWORD_IS_REQUIRED' })}
                            </div>
                        )}
                        {formState.errors.passwordConfirm && (
                            <div className="check-seed__content-error">
                                {intl.formatMessage({ id: 'ERROR_PASSWORD_DOES_NOT_MATCH' })}
                            </div>
                        )}
                    </form>
                </div>
                <div className="enter-new-password__content-buttons">
                    <Button
                        text={intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })}
                        disabled={disabled}
                        onClick={handleSubmit(trySubmit)}
                        form="password"
                    />
                    <Button
                        text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                        white
                        disabled={disabled}
                        onClick={onBack}
                    />
                </div>
            </div>
        </div>
    )
}

export default EnterNewPassword
