import React, { Dispatch, SetStateAction } from 'react'

import Input from '@components/Input'
import Button from '@components/Button'

import './style.scss'

interface IEnterPassword {
    minHeight: string
    setStep: Dispatch<SetStateAction<number>>
}

const EnterPassword: React.FC<IEnterPassword> = ({ setStep, minHeight }) => {
    return (
        <div className="enter-password">
            <div className="enter-password__content" style={{ minHeight }}>
                <div className="enter-password__content-pwd-form">
                    <h2 className="enter-password__content-pwd-form-title">Enter your password</h2>
                    <Input label={'Password...'} autoFocus type={'password'} />
                </div>
            </div>
            <div className="enter-password__buttons">
                <div className="enter-password__buttons-back-btn">
                    <Button text={'Back'} onClick={() => setStep(1)} white />
                </div>
                <Button text={'Next'} onClick={() => setStep(3)} />
            </div>
        </div>
    )
}

export default EnterPassword
