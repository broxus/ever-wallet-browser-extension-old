import React from 'react'
import { useForm } from 'react-hook-form'

import Input from '@popup/components/Input'
import Button from '@popup/components/Button'

import './style.scss'

type Props = {
    minHeight?: string
    disabled?: boolean
    error?: string
    handleNext(password: string): void
    handleBack(): void
}

export function EnterPassword({
    minHeight,
    disabled,
    error,
    handleNext,
    handleBack,
}: Props): JSX.Element {
    const { register, handleSubmit, formState } = useForm<{ password: string }>()

    const onSubmit = ({ password }: { password: string }) => {
        handleNext(password)
    }

    return (
        <div className="enter-password">
            <div className="enter-password__content" style={{ minHeight }}>
                <div className="enter-password__content-pwd-form">
                    <h2 className="enter-password__content-pwd-form-title">Enter your password</h2>
                    <form id="password" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            {...register('password', {
                                required: true,
                                minLength: 6,
                            })}
                            label={'Password...'}
                            disabled={disabled}
                            autoFocus
                            type={'password'}
                        />
                        {(formState.errors.password || error) && (
                            <div className="check-seed__content-error">
                                {formState.errors.password && 'The password is required'}
                                {error}
                            </div>
                        )}
                    </form>
                </div>
            </div>
            <div className="enter-password__buttons">
                <div className="enter-password__buttons-button-back">
                    <Button text={'Back'} disabled={disabled} onClick={() => handleBack()} white />
                </div>
                <Button text={'Next'} disabled={disabled} onClick={handleSubmit(onSubmit)} />
            </div>
        </div>
    )
}
