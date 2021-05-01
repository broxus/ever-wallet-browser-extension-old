import React from 'react'
import { useForm } from 'react-hook-form'

import Input from '@popup/components/Input'
import Button from '@popup/components/Button'

import './style.scss'

interface IEnterPassword {
    minHeight?: string
    disabled?: boolean
    error?: string
    handleNext: (password: string) => void
    handleBack: () => void
}

const EnterPassword: React.FC<IEnterPassword> = ({
    minHeight,
    disabled,
    error,
    handleNext,
    handleBack,
}) => {
    const { register, handleSubmit, errors } = useForm()

    const onSubmit = (data: any) => {
        handleNext(data.pwd)
    }

    return (
        <div className="enter-password">
            <div className="enter-password__content" style={{ minHeight }}>
                <div className="enter-password__content-pwd-form">
                    <h2 className="enter-password__content-pwd-form-title">Enter your password</h2>
                    <form id="password" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            name="pwd"
                            register={register({
                                required: true,
                                minLength: 6,
                            })}
                            label={'Password...'}
                            disabled={disabled}
                            autoFocus
                            type={'password'}
                        />
                        {(errors.pwd || error) && (
                            <div className="check-seed__content-error">
                                {errors.pwd && 'The password is required'}
                                {error}
                            </div>
                        )}
                    </form>
                </div>
            </div>
            <div className="enter-password__buttons">
                <Button text={'Back'} disabled={disabled} onClick={() => handleBack()} white />
                <Button text={'Next'} disabled={disabled} onClick={() => handleSubmit(onSubmit)} />
            </div>
        </div>
    )
}

export default EnterPassword
