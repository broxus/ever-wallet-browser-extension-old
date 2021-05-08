import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import Decimal from 'decimal.js'
import { selectStyles } from '@popup/constants/selectStyle'
import { convertAddress, convertTons, parseTons } from '@shared/utils'
import { MessageToPrepare } from '@shared/approvalApi'
import * as nt from '@nekoton'

import Select from 'react-select'
import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import TransactionProgress from '@popup/components/TransactionProgress'

import UserPic from '@popup/img/user-avatar-placeholder.svg'

import './style.scss'

const options = [
    { value: '60', label: 'TON' },
    /*
    { value: '1', label: 'USDT' },
    { value: '60', label: 'BTC' },
    { value: '60', label: 'ETH' },
    */
]

enum PrepareStep {
    ENTER_ADDRESS,
    ENTER_PASSWORD,
}

type IEnterPassword = {
    account: nt.AssetsList
    params: MessageToPrepare
    fees?: string
    error?: string
    disabled: boolean
    onSubmit: (password: nt.KeyPassword) => void
    onBack: () => void
}

const EnterPassword: React.FC<IEnterPassword> = ({
    account,
    params,
    fees,
    error,
    disabled,
    onSubmit,
    onBack,
}) => {
    const [password, setPassword] = useState<string>('')

    const trySubmit = async () => {
        const keyPassword: nt.KeyPassword = {
            type: 'encrypted_key',
            data: {
                publicKey: account.tonWallet.publicKey,
                password,
            },
        }
        onSubmit(keyPassword)
    }

    return (
        <>
            <h2 className="send-screen__form-title">Enter your password to confirm transaction</h2>
            <div className="send-screen__form-tx-details">
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">You send</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {params.amount}
                    </span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Blockchain fee</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {fees ? `${convertTons(fees)} TON` : 'calculating...'}
                    </span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">
                        Recipient address
                    </span>
                    <span className="send-screen__form-tx-details-param-value">
                        {convertAddress(params.recipient)}
                    </span>
                </div>
            </div>
            <Input
                className="send-screen__form-comment"
                label={'Password...'}
                type="password"
                disabled={disabled}
                value={password}
                onChange={setPassword}
            />
            {error && <div className="send-screen__form-error">{error}</div>}
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button
                    text={'Confirm transaction'}
                    onClick={trySubmit}
                    disabled={disabled || password.length === 0}
                />
            </div>
        </>
    )
}

type MessageParams = {
    recipient: string
    amount: string
    comment?: string
}

type IPrepareMessage = {
    account: nt.AssetsList
    tonWalletState: nt.ContractState
    estimateFees: (params: MessageToPrepare) => Promise<string>
    prepareMessage: (
        params: MessageToPrepare,
        password: nt.KeyPassword
    ) => Promise<nt.SignedMessage>
    onSubmit: (message: nt.SignedMessage) => void
    onBack: () => void
}

const PrepareMessage: React.FC<IPrepareMessage> = ({
    account,
    tonWalletState,
    estimateFees,
    prepareMessage,
    onSubmit,
    onBack,
}) => {
    const [localStep, setLocalStep] = useState(PrepareStep.ENTER_ADDRESS)
    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState()
    const [messageToPrepare, setMessageToPrepare] = useState<MessageToPrepare>()
    const [fees, setFees] = useState<string>()

    const { register, setValue, handleSubmit, errors, getValues } = useForm<MessageParams>()

    const submitMessageParams = (data: MessageParams) => {
        const messageToPrepare: MessageToPrepare = {
            recipient: data.recipient,
            amount: parseTons(data.amount),
            payload: data.comment ? nt.encodeComment(data.comment) : undefined,
        }

        setFees(undefined)
        estimateFees(messageToPrepare)
            .then((fees) => {
                setFees(fees)
            })
            .catch(console.error)

        setMessageToPrepare(messageToPrepare)
        setLocalStep(PrepareStep.ENTER_PASSWORD)
    }

    const submitPassword = async (password: nt.KeyPassword) => {
        if (messageToPrepare == null) {
            return
        }

        setError(undefined)
        setInProcess(true)
        try {
            const signedMessage = await prepareMessage(messageToPrepare, password)
            onSubmit(signedMessage)
        } catch (e) {
            setError(e.toString())
        } finally {
            setInProcess(false)
        }
    }

    const balance = new Decimal(tonWalletState?.balance || '0')

    const paramsFormHidden = localStep != PrepareStep.ENTER_ADDRESS

    return (
        <>
            <div
                style={{
                    visibility: paramsFormHidden ? 'hidden' : undefined,
                    height: paramsFormHidden ? '0' : undefined,
                }}
            >
                <div className="send-screen__account_details">
                    <UserPic />{' '}
                    <span className="send-screen__account_details-title">{account.name}</span>
                </div>

                <h2 className="send-screen__form-title">Enter receiver address</h2>
                <form id="send" onSubmit={handleSubmit(submitMessageParams)}>
                    <Select
                        name="currency"
                        className="send-screen__form-token-dropdown"
                        options={options}
                        defaultValue={options?.[0]}
                        placeholder={'Select currency'}
                        styles={selectStyles}
                    />
                    <Input
                        name="amount"
                        type="text"
                        label={'Amount...'}
                        onChange={(value) => setValue('amount', value.trim())}
                        register={register({
                            required: true,
                            pattern: /^(?:0|[1-9][0-9]*)(?:.[0-9]{0,9})?$/,
                            validate: (value?: string) => {
                                try {
                                    const current = new Decimal(parseTons(value || ''))
                                    return current.lessThanOrEqualTo(balance)
                                } catch (e) {
                                    console.error(e)
                                    return false
                                }
                            },
                        })}
                    />
                    {errors.amount && (
                        <div className="send-screen__form-error">
                            {errors.amount.type == 'required' && 'This field is required'}
                            {errors.amount.type == 'validate' && 'Insufficient amount'}
                            {errors.amount.type == 'pattern' && 'Invalid format'}
                        </div>
                    )}
                    <div className="send-screen__form-balance">
                        Your balance: {convertTons(tonWalletState?.balance)} TON
                    </div>
                    <Input
                        name="recipient"
                        label={'Receiver address...'}
                        onChange={(value) => setValue('recipient', value)}
                        register={register({
                            required: true,
                            pattern: /(?:-1|0):[0-9a-fA-F]{64}/,
                            validate: (value: string) => nt.checkAddress(value),
                        })}
                        type="text"
                    />
                    {errors.recipient && (
                        <div className="send-screen__form-error">
                            {errors.recipient.type == 'required' && 'This field is required'}
                            {errors.recipient.type == 'validate' && 'Invalid recipient'}
                            {errors.recipient.type == 'pattern' && 'Invalid format'}
                        </div>
                    )}
                    <Input
                        name="comment"
                        label={'Comment...'}
                        className="send-screen__form-comment"
                        onChange={(value) => setValue('comment', value)}
                        register={register()}
                        type="text"
                    />
                </form>
                <div style={{ display: 'flex' }}>
                    <div style={{ width: '50%', marginRight: '12px' }}>
                        <Button text={'Back'} onClick={onBack} white />
                    </div>
                    <Button text={'Send'} onClick={handleSubmit(submitMessageParams)} form="send" />
                </div>
            </div>
            {localStep == PrepareStep.ENTER_PASSWORD && (
                <EnterPassword
                    account={account}
                    params={getValues()}
                    fees={fees}
                    error={error}
                    disabled={inProcess}
                    onSubmit={submitPassword}
                    onBack={() => {
                        setLocalStep(PrepareStep.ENTER_ADDRESS)
                    }}
                />
            )}
        </>
    )
}

interface ISend {
    account: nt.AssetsList
    tonWalletState: nt.ContractState
    estimateFees: (params: MessageToPrepare) => Promise<string>
    prepareMessage: (
        params: MessageToPrepare,
        keyPassword: nt.KeyPassword
    ) => Promise<nt.SignedMessage>
    sendMessage: (params: nt.SignedMessage) => Promise<nt.Transaction>
    onBack: () => void
}

const Send: React.FC<ISend> = ({
    account,
    tonWalletState,
    estimateFees,
    prepareMessage,
    sendMessage,
    onBack,
}) => {
    const [pendingResponse, setPendingResponse] = useState<Promise<nt.Transaction>>()

    const trySendMessage = async (message: nt.SignedMessage) => {
        setPendingResponse(sendMessage(message))
    }

    if (pendingResponse == null) {
        return (
            <PrepareMessage
                account={account}
                tonWalletState={tonWalletState}
                prepareMessage={prepareMessage}
                estimateFees={estimateFees}
                onBack={onBack}
                onSubmit={(message) => {
                    trySendMessage(message).then(() => {})
                }}
            />
        )
    } else {
        return <TransactionProgress pendingResponse={pendingResponse} onBack={onBack} />
    }
}

export default Send
