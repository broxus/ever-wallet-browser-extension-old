import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { selectStyles } from '@popup/constants/selectStyle'
import walletOptions from '@popup/constants/walletTypes'

import Select from 'react-select'
import Input from '@popup/components/Input'
import EnterPassword from '@popup/components/EnterPassword'
import CheckSeed from '@popup/components/CheckSeed'
import Button from '@popup/components/Button'
import PlusSign from '@popup/img/plus-sign-grey.svg'
import LedgerIcon from '@popup/img/ledger.svg'

import './style.scss'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import ConnectLedger from '@popup/components/ConnectLedger'
import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import {
    ENVIRONMENT_TYPE_FULLSCREEN,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_POPUP,
} from '@shared/constants'

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

interface ISelectAccountType {
    setSelected: Dispatch<SetStateAction<string | undefined>>
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

const SelectAccountType: React.FC<ISelectAccountType> = ({ setSelected }) => {
    const [walletType, setWalletType] = useState<string | undefined>(undefined)
    return (
        <div className="create-account-page__content">
            <h2 style={{ marginBottom: '28px' }}>Add account</h2>
            <div className="create-account-page__options">
                <div
                    className={`create-account-page__options-option ${
                        walletType === 'new' ? 'create-account-page__options-option-selected' : ''
                    }`}
                    onClick={() => setWalletType('new')}
                >
                    {/*@ts-ignore*/}
                    <PlusSign className="create-account-page__options-icon" />
                    Create account
                </div>
                <div
                    className={`create-account-page__options-option ${
                        walletType === 'ledger'
                            ? 'create-account-page__options-option-selected'
                            : ''
                    }`}
                    onClick={() => setWalletType('ledger')}
                >
                    {/*@ts-ignore*/}
                    <LedgerIcon className="create-account-page__options-icon" />
                    Connect Ledger
                </div>
            </div>

            <Button
                text={'Next'}
                disabled={!walletType}
                onClick={() => {
                    setSelected(walletType)
                }}
            />
        </div>
    )
}

interface ICreateAccountPage {
    controllerRpc: IControllerRpcClient
    onClose: () => void
    setShowLedgerPage: Dispatch<SetStateAction<boolean>>
}

const CreateAccountPage: React.FC<ICreateAccountPage> = ({
    controllerRpc,
    onClose,
    setShowLedgerPage,
}) => {
    const [step, setStep] = useState<number>(0)
    const [accountType, setAccountType] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (accountType === 'ledger') {
            // history.push('/home.html')
            // window.location.href = '/home.html'
            setShowLedgerPage(true)
        }
    }, [accountType])

    const createAccountContent = useMemo(
        () => [
            <AccountName setStep={setStep} />,
            <AccountSelectKey setStep={setStep} />,
            <EnterPassword handleBack={() => setStep(1)} handleNext={() => setStep(3)} />,
            // @ts-ignore
            <CheckSeed setStep={setStep} />,
        ],
        []
    )
    //
    // if (parseUrl.pathname === '/popup.html') {
    //     return ENVIRONMENT_TYPE_POPUP
    // } else if (parseUrl.pathname === '/notification.html') {
    //     return ENVIRONMENT_TYPE_NOTIFICATION
    // } else if (parseUrl.pathname === '/home.html') {
    //     return ENVIRONMENT_TYPE_FULLSCREEN
    // }

    const connectLedger = [
        <ConnectLedger
            onNext={() => setStep(1)}
            onBack={() => {
                onClose()
            }}
            // createLedgerKey={createLedgerKey}
            // removeKey={removeKey}
            // createAccount={createAccount}
            // selectAccount={selectAccount}
            // getLedgerFirstPage={getLedgerFirstPage}
        />,
        <SelectLedgerAccount controllerRpc={controllerRpc} />,
    ]

    if (accountType === 'new') {
        return createAccountContent[step]
    } else if (accountType === 'ledger') {
        return connectLedger[step]
    }

    return <SelectAccountType setSelected={setAccountType} />
}
export default CreateAccountPage
