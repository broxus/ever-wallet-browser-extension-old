import React from 'react'
import Input from '../../components/Input/Input'
import { Button } from '../../components/button'
import './create-password.scss'

export const ConfirmPasswordScreen = () => (
    <div className="create-password-page__content">
        <div className="create-password-page__content-pwd-form">
            <h2>Confirm the password </h2>
            <h3 className="create-password-page__content-pwd-title">
                If you forget it, you will need to restore the wallet from the seed phrase
            </h3>
            <Input label={'Your password...'} autoFocus type={'text'} />
        </div>
        <div className="create-password-page__content-buttons">
            <Button text={'Create the wallet'} />
            <Button text={'Back'} white noBorder />
        </div>
    </div>
)

const CreatePasswordScreen = () => (
    <div className="create-password-page__content">
        <div className="create-password-page__content-pwd-form">
            <h2>Create a password</h2>
            <h3 className="create-password-page__content-pwd-title">
                We will ask for it at each transaction. If you forget it, you will need to restore
                the wallet from the seed phrase
            </h3>
            <Input label={'Your password'} autoFocus type={'text'} />
            <Input label={'Confirm password'} type={'text'} />
        </div>
        <div className="create-password-page__content-buttons">
            <Button text={'Next'} />
            <Button text={'Back'} white noBorder />
        </div>
    </div>
)

export default CreatePasswordScreen
