import React, { Dispatch, SetStateAction, useState } from 'react'
import Input from '../../components/Input/Input'
import { Button } from '../../components/button'
import EnterPassword from '../../components/EnterPassword/EnterPassword'
import Select from 'react-select'
import SaveSeed from '../../components/SaveSeed/SaveSeed'
import { selectStyles } from '../../constants/selectStyle'
import walletOptions from '../../constants/walletTypes'
import './create-account.scss'
import CheckSeed from '../../components/CheckSeed/CheckSeed'

const options = [
    { value: '1', label: 'Key 1' },
    { value: '60', label: 'Generate new key' },
    { value: '60', label: 'Import key' },
]

interface IAccountSelectKey {
    setStep: Dispatch<SetStateAction<number>>
}

const groupStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
}

const groupBadgeStyles = {
    backgroundColor: '#EBECF0',
    borderRadius: '2em',
    color: '#172B4D',
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 'normal',
    lineHeight: '1',
    minWidth: 1,
    padding: '0.16666666666667em 0.5em',
    textAlign: 'center',
}

const formatGroupLabel = (data: any) => (
    <div style={groupStyles}>
        <span>{data.label}</span>
        {/*@ts-ignore*/}
        <span style={groupBadgeStyles}>{data.options.length}</span>
    </div>
)

export const groupedOptions = [
    {
        label: 'Key1',
        options: [{ value: '1', label: 'Key 1' }],
    },
    { value: '60', label: 'Generate new key' },
    { value: '60', label: 'Import key' },
]

const AccountSelectKey: React.FC<IAccountSelectKey> = ({ setStep }) => {
    return (
        <div className="create-account-page__content">
            <div className="create-account-page__content-select-key">
                <h2 className="create-account-page__content-select-key-title">Step 2</h2>
                <Select
                    className="send-screen__form-token-dropdown"
                    options={options}
                    placeholder={'Select the key...'}
                    styles={selectStyles}
                    formatGroupLabel={formatGroupLabel}

                    // onChange={(token) => {
                    //     setToken(token)
                    // }}
                />
                <Select
                    className="send-screen__form-token-dropdown"
                    options={walletOptions}
                    placeholder={'Select wallet type...'}
                    styles={selectStyles}

                    // onChange={(token) => {
                    //     setToken(token)
                    // }}
                />
            </div>
            <div className="create-account-page__content-buttons">
                <div className="create-account-page__content-buttons-back-btn">
                    <Button text={'Back'} onClick={() => setStep(0)} white />
                </div>
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
            <Button text={'Next'} onClick={() => setStep(1)} />
        </div>
    )
}

const CreateAccountScreen = () => {
    const [step, setStep] = useState<number>(0)
    const createAccountContent = [
        <AccountName setStep={setStep} />,
        <AccountSelectKey setStep={setStep} />,
        <EnterPassword setStep={setStep} minHeight={'448px'} />,
        <SaveSeed setStep={setStep} />,
        // @ts-ignore
        <CheckSeed setStep={setStep} />,
    ]
    return createAccountContent[step]
}
export default CreateAccountScreen
