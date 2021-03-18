import React from 'react'
import Input from '../../components/Input/Input'
import { Button } from '../../components/button'
import './create-account.scss'

const CreateAccountScreen = () => (
    <div className="create-account-page__content">
        <div className="create-account-page__content-pwd-form">
            <h2>Name your new account</h2>
            <h3 className="create-account-page__content-pwd-title">
                Choose wisely
            </h3>
            <Input label={'Enter new account name...'} autoFocus type={'text'} />
        </div>
        <div className="create-account-page__content-buttons">
            <Button text={'Create new account'} />
            <Button text={'Back'} white noBorder />
        </div>
    </div>
)

export default CreateAccountScreen
