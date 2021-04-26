import React from 'react'

import Input from '@components/Input'
import Button from '@components/Button'

import './style.scss'
import { useForm } from 'react-hook-form'

interface IEnterPassword {
    minHeight?: string
    handleNext: (password: string) => void
    handleBack: () => void
}

const EnterPassword: React.FC<IEnterPassword> = ({ minHeight, handleNext, handleBack }) => {
    const { register, handleSubmit, errors } = useForm()

    const onSubmit = (data: any) => {
        console.log('data in onSubmit')
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
                            autoFocus
                            type={'password'}
                        />
                        {errors.pwd && (
                            <div className="check-seed__content-error">
                                The password is required
                            </div>
                        )}
                    </form>
                </div>
            </div>
            <div className="enter-password__buttons">
                <Button text={'Back'} onClick={() => handleBack()} white />
                <Button text={'Next'} type="submit" form="password" />
            </div>
        </div>
    )
}

export default EnterPassword
