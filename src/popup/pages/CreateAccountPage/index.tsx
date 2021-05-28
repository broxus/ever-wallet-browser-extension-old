import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { selectStyles } from '@popup/constants/selectStyle'
import walletOptions from '@popup/constants/walletTypes'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import Select from 'react-select'
import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import CheckLedgerConnection from '@popup/components/CheckLedgerConnection'

import './style.scss'
import * as nt from '@nekoton'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import SelectContractType from '@popup/components/SelectContractType'
import EnterNewPassword from '@popup/components/EnterNewPassword'
import EnterPassword from '@popup/components/EnterPassword'

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

type IPlusSign = {
    className: string
}

const PlusSign: React.FC<IPlusSign> = ({ className }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g filter="url(#filter0_b)">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M13 4H11V11H4V13H11V20H13V13H20V11H13V4Z"
                fill="#96A1A7"
            />
        </g>
        <defs>
            <filter
                id="filter0_b"
                x="-20"
                y="-20"
                width="64"
                height="64"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
            >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feGaussianBlur in="BackgroundImage" stdDeviation="10" />
                <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur" />
                <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="effect1_backgroundBlur"
                    result="shape"
                />
            </filter>
        </defs>
    </svg>
)

type ILedgerIcon = {
    className: string
}

const LedgerIcon: React.FC<ILedgerIcon> = ({ className }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1 0C0.447715 0 0 0.447715 0 1V5.00026C0 5.55254 0.447715 6.00026 1 6.00026H5.00026C5.55254 6.00026 6.00026 5.55254 6.00026 5.00026V1C6.00026 0.447715 5.55254 0 5.00026 0H1ZM9.99932 0C9.44704 0 8.99932 0.447715 8.99932 1V14.6007C8.99932 15.153 9.44704 15.6007 9.99932 15.6007H23C23.5523 15.6007 24 15.153 24 14.6007V1C24 0.447715 23.5523 0 23 0H9.99932ZM0 10.0003C0 9.44803 0.447715 9.00032 1 9.00032H5.00026C5.55254 9.00032 6.00026 9.44803 6.00026 10.0003V14.0006C6.00026 14.5529 5.55254 15.0006 5.00026 15.0006H1C0.447715 15.0006 0 14.5529 0 14.0006V10.0003ZM1 17.9998C0.447715 17.9998 0 18.4476 0 18.9998V23.0001C0 23.5524 0.447715 24.0001 1 24.0001H5.00026C5.55254 24.0001 6.00026 23.5524 6.00026 23.0001V18.9998C6.00026 18.4476 5.55254 17.9998 5.00026 17.9998H1ZM8.99932 18.9998C8.99932 18.4476 9.44704 17.9998 9.99932 17.9998H13.9996C14.5519 17.9998 14.9996 18.4476 14.9996 18.9998V23.0001C14.9996 23.5524 14.5519 24.0001 13.9996 24.0001H9.99932C9.44704 24.0001 8.99932 23.5524 8.99932 23.0001V18.9998ZM19.0006 17.9998C18.4484 17.9998 18.0006 18.4476 18.0006 18.9998V23.0001C18.0006 23.5524 18.4484 24.0001 19.0006 24.0001H23.0009C23.5532 24.0001 24.0009 23.5524 24.0009 23.0001V18.9998C24.0009 18.4476 23.5532 17.9998 23.0009 17.9998H19.0006Z"
            fill="#96A1A7"
        />
    </svg>
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
                    <Button
                        text={'Back'}
                        onClick={() => setStep(NewAccountLocalStep.SELECT_ACCOUNT_NAME)}
                        white
                    />
                </div>
                <Button
                    text={'Next'}
                    onClick={() => setStep(NewAccountLocalStep.SELECT_CONTRACT_TYPE)}
                />
            </div>
        </div>
    )
}

interface ISelectAccountType {
    setSelected: Dispatch<SetStateAction<string | undefined>>
}

interface IAccountName {
    onSubmit: (accountName: string) => void
}

const AccountName: React.FC<IAccountName> = ({ onSubmit }) => {
    const [accountName, setAccountName] = useState('')
    return (
        <div className="create-account-page__content">
            <div className="create-account-page__content-pwd-form">
                <h2>Name your new account</h2>
                <h3 className="create-account-page__content-pwd-title">Choose wisely</h3>
                <Input
                    label={'Enter new account name...'}
                    autoFocus
                    type={'text'}
                    onChange={setAccountName}
                />
            </div>
            <Button
                text={'Next'}
                disabled={!accountName.length}
                onClick={() => {
                    onSubmit(accountName)
                }}
            />
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

enum NewAccountLocalStep {
    SELECT_ACCOUNT_NAME,
    SELECT_CONTRACT_TYPE,
    ENTER_PASSWORD,
}

enum LedgerAccountLocalStep {
    CHECK_LEDGER_CONNECTION,
    SELECT_LEDGER_ACCOUNT,
}

interface ICreateAccountPage {
    controllerRpc: IControllerRpcClient
    controllerState: ControllerState
    onClose: () => void
}

const CreateAccountPage: React.FC<ICreateAccountPage> = ({
    controllerRpc,
    controllerState,
    onClose,
}) => {
    const [inProcess, setInProcess] = useState<boolean>(false)
    const [accountType, setAccountType] = useState<string>()
    const [newAccountStep, setNewAccountStep] = useState<number>(
        NewAccountLocalStep.SELECT_ACCOUNT_NAME
    )
    const [ledgerAccountStep, setLedgerNewAccountStep] = useState<number>(
        LedgerAccountLocalStep.CHECK_LEDGER_CONNECTION
    )
    const [error, setError] = useState<string>()

    const [accountName, setAccountName] = useState<string>('')
    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const accountId = 2

    const onSubmit = async (password: string) => {
        console.log('onSubmit')

        let key: nt.KeyStoreEntry | undefined
        try {
            setInProcess(true)
            key = await controllerRpc.createDerivedKey({
                accountId,
                password,
            })

            console.log('Key: ', key)

            await controllerRpc.createAccount({
                name: accountName,
                publicKey: key.publicKey,
                contractType,
            })
        } catch (e) {
            console.log('Exception: ', e)
            key && controllerRpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
            setInProcess(false)
            setError(e.toString())
        }
    }

    const openLedgerConnectPage = () => {
        if (accountType === 'ledger') {
            controllerRpc
                .openExtensionInBrowser({
                    route: 'connect-ledger',
                })
                .catch(console.error)
        }
    }

    const createAccountContent = useMemo(
        () => [
            <AccountName
                onSubmit={(accountName) => {
                    console.log(accountName)
                    setAccountName(accountName)
                    setNewAccountStep(NewAccountLocalStep.SELECT_CONTRACT_TYPE)
                }}
            />,
            <SelectContractType
                onSubmit={(contractType) => {
                    console.log('SelectContractType')
                    setContractType(contractType)
                    setNewAccountStep(NewAccountLocalStep.ENTER_PASSWORD)
                }}
                onBack={() => {
                    setNewAccountStep(NewAccountLocalStep.SELECT_ACCOUNT_NAME)
                }}
                excludedContracts={['WalletV3']}
            />,
            <EnterPassword
                disabled={inProcess}
                handleNext={async (password) => {
                    console.log('EnterNewPassword')
                    await onSubmit(password)
                }}
                handleBack={() => {
                    setNewAccountStep(NewAccountLocalStep.SELECT_CONTRACT_TYPE)
                }}
            />,
            // <EnterNewPassword
            //     disabled={inProcess}
            //     onSubmit={async (password) => {
            //         console.log("EnterNewPassword")
            //         await onSubmit(password)
            //     }}
            //     onBack={() => {
            //         setNewAccountStep(NewAccountLocalStep.SELECT_CONTRACT_TYPE)
            //     }}
            // />,
        ],
        []
    )

    const connectLedger = [
        <CheckLedgerConnection
            onSuccess={() => setLedgerNewAccountStep(LedgerAccountLocalStep.SELECT_LEDGER_ACCOUNT)}
            onFailed={() => openLedgerConnectPage()}
        />,
        <SelectLedgerAccount
            controllerRpc={controllerRpc}
            onSuccess={onClose}
            controllerState={controllerState}
        />,
    ]

    if (accountType === 'new') {
        return createAccountContent[newAccountStep]
    } else if (accountType === 'ledger') {
        return connectLedger[ledgerAccountStep]
    }

    return <SelectAccountType setSelected={setAccountType} />
}

export default CreateAccountPage
