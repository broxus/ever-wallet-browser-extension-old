import React from 'react'
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
    const { register, handleSubmit, watch, formState } = useForm()

    const trySubmit = (data: any) => {
        !disabled && onSubmit(data.password)
    }

    return (
        <div className="enter-new-password">
            <div className="enter-new-password__content">
                <div className="enter-new-password__content-pwd-form">
                    <h2 className="enter-new-password__content-pwd-form-header">
                        Password protection
                    </h2>
                    <h3 className="enter-new-password__content-pwd-form-comment">
                        So no one else, but you can unlock your wallet.
                    </h3>
                    <form
                        id="password"
                        onSubmit={handleSubmit(trySubmit)}
                        style={{ position: 'relative' }}
                    >
                        <Input
                            label={'Your password'}
                            autoFocus
                            disabled={disabled}
                            type={'password'}
                            {...register('password', {
                                required: true,
                                minLength: 6,
                            })}
                        />
                        <Input
                            label={'Confirm password'}
                            type={'password'}
                            disabled={disabled}
                            {...register('passwordConfirm', {
                                required: true,
                                validate: (value) => value === watch('password'),
                            })}
                        />
                        {formState.errors.password && (
                            <div className="check-seed__content-error">
                                The password is required and must be minimum 6 characters long
                            </div>
                        )}
                        {formState.errors.passwordConfirm && (
                            <div className="check-seed__content-error">
                                Your password doesn't match
                            </div>
                        )}
                    </form>
                </div>
                <div className="enter-new-password__content-buttons">
                    <Button
                        text={'Sign in the wallet'}
                        disabled={disabled}
                        onClick={handleSubmit(trySubmit)}
                        form="password"
                    />
                    <Button text={'Back'} white disabled={disabled} onClick={onBack} />
                </div>
            </div>
        </div>
    )
}

export default EnterNewPassword
