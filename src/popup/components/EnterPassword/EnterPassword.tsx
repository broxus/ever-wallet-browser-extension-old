import React, { Dispatch, SetStateAction } from 'react'
import Input from '../Input/Input'
import { Button } from '../button'
import './enter-password.scss'

interface IEnterPassword {
    setStep: Dispatch<SetStateAction<number>>
}

const EnterPassword: React.FC<IEnterPassword> = ({ setStep }) => {
    return (
        <div className="enter-password">
            <div className="enter-password__content">
                <div className="enter-password__content-pwd-form">
                    <h2>Enter your password</h2>
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
