import React, { Dispatch, SetStateAction } from 'react'

import Input from '@components/Input'
import Button from '@components/Button'

import './style.scss'

interface IEnterPassword {
    minHeight?: string
    handleNext: () => void
    handleBack: () => void
}

const EnterPassword: React.FC<IEnterPassword> = ({ minHeight, handleNext, handleBack }) => {
    return (
        <div className="enter-password">
            <div className="enter-password__content" style={{ minHeight }}>
                <div className="enter-password__content-pwd-form">
                    <h2 className="enter-password__content-pwd-form-title">Enter your password</h2>
                    <Input label={'Password...'} autoFocus type={'password'} />
                </div>
            </div>
            <div className="enter-password__buttons">
                <Button text={'Back'} onClick={() => handleBack()} white />
                <Button text={'Next'} onClick={() => handleNext()} />
            </div>
        </div>
    )
}

export default EnterPassword
