import React, { Dispatch, SetStateAction } from 'react'
import Input from '../Input/Input'
import { Button } from '../button'
import './enter-password.scss'

interface IEnterPassword {
    setStep: Dispatch<SetStateAction<number>>
}

const EnterPassword: React.FC<IEnterPassword> = ({ setStep }) => {
    return (
        <div className="create-account-page__content">
            <div className="create-account-page__content-pwd-form">
                <h2>Name your new account</h2>
                <h3 className="create-account-page__content-pwd-title">Choose wisely</h3>
                <Input label={'Enter new account name...'} autoFocus type={'text'} />
            </div>
            <div className="create-account-page__content-buttons">
                <Button text={'Next'} onClick={() => setStep(3)} />
            </div>
        </div>
    )
}

export default EnterPassword
