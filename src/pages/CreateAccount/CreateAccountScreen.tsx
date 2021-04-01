import React, { Dispatch, SetStateAction, useState } from 'react'
import Input from '../../components/Input/Input'
import { Button } from '../../components/button'
import EnterPassword from '../../components/EnterPassword/EnterPassword'
import Select from 'react-select'
import { selectStyles } from '../../components/Send/Send'
import './create-account.scss'

interface ICheckSeed {
    setStep: Dispatch<SetStateAction<number>>
}

const CheckSeed: React.FC<ICheckSeed> = ({ setStep }) => {
    return (
        <div className="create-account-page__content">
            <div className="create-account-page__content-pwd-form">
                <h2>Name your new account</h2>
                <h3 className="create-account-page__content-pwd-title">Choose wisely</h3>
                <Input label={'Enter new account name...'} autoFocus type={'text'} />
            </div>
            <div className="create-account-page__content-buttons">
                <Button text={'Back'} white />
                <Button text={'Confirm'} onClick={() => setStep(5)} />
            </div>
        </div>
    )
}

interface ISaveSeed {
    setStep: Dispatch<SetStateAction<number>>
}

const SaveSeed: React.FC<ISaveSeed> = ({ setStep }) => {
    return (
        <div className="create-account-page__content">
            <div className="create-account-page__content-pwd-form">
                <h2>Name your new account</h2>
                <h3 className="create-account-page__content-pwd-title">Choose wisely</h3>
                <Input label={'Enter new account name...'} autoFocus type={'text'} />
            </div>
            <div className="create-account-page__content-buttons">
                <Button text={'Back'} white />
                <Button text={'I wrote it down on paper'} onClick={() => setStep(4)} />
            </div>
        </div>
    )
}

const options = [
    { value: '1', label: 'Key 1' },
    { value: '60', label: 'Generate new key' },
    { value: '60', label: 'Import key' },
]

interface IAccountSelectKey {
    setStep: Dispatch<SetStateAction<number>>
}

const AccountSelectKey: React.FC<IAccountSelectKey> = ({ setStep }) => {
    return (
        <div className="create-account-page__content">
            <div className="create-account-page__content-pwd-form">
                <h2>Step 2</h2>
                <Select
                    className="send-screen__form-token-dropdown"
                    options={options}
                    placeholder={'Select the key...'}
                    styles={selectStyles}
                    w
                    // onChange={(token) => {
                    //     setToken(token)
                    // }}
                />
                <Select
                    className="send-screen__form-token-dropdown"
                    options={options}
                    placeholder={'Select wallet type...'}
                    styles={selectStyles}
                    w
                    // onChange={(token) => {
                    //     setToken(token)
                    // }}
                />
            </div>
            <div className="create-account-page__content-buttons">
                <Button text={'Back'} white />
                <Button text={'Next'} onClick={() => setStep(2)} />
            </div>
        </div>
    )
}

interface IAccountName {
    setStep: Dispatch<SetStateAction<number>>
}

const AccountName: React.FC<IAccountName> = ({ setStep }) => {
    return (
        <div className="create-account-page__content">
            <div className="create-account-page__content-pwd-form">
                <h2>Name your new account</h2>
                <h3 className="create-account-page__content-pwd-title">Choose wisely</h3>
                <Input label={'Enter new account name...'} autoFocus type={'text'} />
            </div>
            <div className="create-account-page__content-buttons">
                <Button text={'Next'} onClick={() => setStep(1)} />
            </div>
        </div>
    )
}

const CreateAccountScreen = () => {
    const [step, setStep] = useState<number>(0)
    const createAccountContent = [
        <AccountName setStep={setStep} />,
        <AccountSelectKey setStep={setStep} />,
        <EnterPassword setStep={setStep} />,
        <SaveSeed setStep={setStep} />,
        <CheckSeed setStep={setStep} />,
    ]
    return createAccountContent[step]
}
export default CreateAccountScreen
