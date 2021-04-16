import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { connect } from 'react-redux'
import { AppState, DeliveredMessage, MessageToPrepare } from '@store/app/types'
import { selectStyles } from '../../constants/selectStyle'
import { Action, convertAddress, convertTons } from '@utils'
import {
    prepareMessage,
    sendMessage,
    estimateFees,
    removeDeliveredMessage,
    removeExpiredMessage,
} from '@store/app/actions'
import * as nt from '@nekoton'

import Lottie from 'react-lottie-player'
import Select from 'react-select'
import Input from '@components/Input'
import Button from '@components/Button'

import MoneyAnimation from '@img/lottie/money.json'
import DoneAnimation from '@img/lottie/done.json'
import FailedAnimation from '@img/lottie/failed.json'
import UserPic from '@img/user-avatar-placeholder.svg'

import './style.scss'

const options = [
    { value: '60', label: 'TON' },
    /*
    { value: '1', label: 'USDT' },
    { value: '60', label: 'BTC' },
    { value: '60', label: 'ETH' },
    */
]

enum LocalStep {
    ENTER_ADDRESS,
    ENTER_PASSWORD,
    SENDING,
}

type ITransactionExpired = {
    onBack: () => void
}

const TransactionExpired: React.FC<ITransactionExpired> = ({ onBack }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Transaction expired</h2>
            <div className="send-screen__tx-sending">
                <Lottie
                    loop
                    animationData={FailedAnimation}
                    play
                    style={{ width: 150, height: 150 }}
                />
            </div>
            <Button text={'OK'} type={'button'} onClick={onBack} />
        </>
    )
}

type ITransactionSent = {
    onBack: () => void
}

const TransactionSent: React.FC<ITransactionSent> = ({ onBack }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Transaction has been sent</h2>
            <div className="send-screen__tx-sending">
                <Lottie
                    loop
                    animationData={DoneAnimation}
                    play
                    style={{ width: 150, height: 150 }}
                />
            </div>
            <Button text={'OK'} type={'button'} onClick={onBack} />
        </>
    )
}

export type ITransactionSending = {
    onBack: () => void
}

const TransactionSending: React.FC<ITransactionSending> = ({ onBack }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Transaction is sending...</h2>
            <div className="send-screen__tx-sending">
                <Lottie
                    loop
                    animationData={MoneyAnimation}
                    play
                    style={{ width: 150, height: 150 }}
                />
            </div>
            <Button text={'OK'} type={'button'} onClick={onBack} />
        </>
    )
}

type IEnterPassword = {
    account: nt.AssetsList | null
    params: MessageToPrepare
    prepareMessage: Action<typeof prepareMessage>
    estimateFees: Action<typeof estimateFees>
    sendMessage: Action<typeof sendMessage>
    onSubmit: (pendingTransaction: nt.PendingTransaction) => void
    onBack: () => void
}

const EnterPassword: React.FC<IEnterPassword> = ({
    account,
    params,
    prepareMessage,
    estimateFees,
    sendMessage,
    onSubmit,
    onBack,
}) => {
    const [password, setPassword] = useState('')
    const [unsignedMessage, setUnsignedMessage] = useState<nt.UnsignedMessage>()
    const [currentFees, setCurrentFees] = useState<string>()

    useEffect(() => {
        ;(async () => {
            const unsignedMessage = await prepareMessage(account.tonWallet.address, params)
            setUnsignedMessage(unsignedMessage)

            const fakeMessage = unsignedMessage.signFake()
            const fees = await estimateFees(account.tonWallet.address, fakeMessage)
            setCurrentFees(fees)
        })()
    }, [])

    const disabled = unsignedMessage == null || password.length === 0

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
                        {currentFees ? `${convertTons(currentFees)} TON` : 'calculating...'}
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
                value={password}
                onChange={setPassword}
            />
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button
                    text={'Confirm transaction'}
                    onClick={async () => {
                        if (unsignedMessage != null) {
                            const pendingTransaction = await sendMessage(
                                account.tonWallet.address,
                                unsignedMessage,
                                password
                            )
                            onSubmit(pendingTransaction)
                        }
                    }}
                    disabled={disabled}
                />
            </div>
        </>
    )
}

type IEnterAddress = {
    account: nt.AssetsList
    tonWalletState: nt.AccountState
    onSubmit: (params: MessageToPrepare) => void
    onBack: () => void
}

const EnterAddress: React.FC<IEnterAddress> = ({ account, tonWalletState, onSubmit, onBack }) => {
    const { register, handleSubmit, errors } = useForm()

    return (
        <>
            <div className="send-screen__account_details">
                <UserPic />{' '}
                <span className="send-screen__account_details-title">{account.name}</span>
            </div>

            <h2 className="send-screen__form-title">Enter receiver address</h2>
            <form id="send" onSubmit={handleSubmit(onSubmit)}>
                <Select
                    className="send-screen__form-token-dropdown"
                    options={options}
                    defaultValue={options?.[0]}
                    placeholder={'Select currency'}
                    styles={selectStyles}
                />
                <Input
                    label={'Amount...'}
                    register={register({
                        required: true,
                    })}
                    name="amount"
                />
                {errors.amount && (
                    <div className="send-screen__form-error">This field is required</div>
                )}
                <div className="send-screen__form-balance">
                    Your balance: {convertTons(tonWalletState?.balance)} TON
                </div>
                <Input
                    label={'Receiver address...'}
                    register={register({
                        required: true,
                    })}
                    type="text"
                    name="recipient"
                />
                {errors.address && (
                    <div className="send-screen__form-error">This field is required</div>
                )}
                <Input
                    label={'Comment...'}
                    className="send-screen__form-comment"
                    register={register()}
                    type="text"
                    name="comment"
                />
            </form>
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button text={'Send'} onClick={handleSubmit(onSubmit)} form="send" />
            </div>
        </>
    )
}

interface IAddNewToken {
    account: nt.AssetsList
    tonWalletState: nt.AccountState
    deliveredMessages: DeliveredMessage[]
    expiredMessages: nt.PendingTransaction[]
    prepareMessage: Action<typeof prepareMessage>
    estimateFees: Action<typeof estimateFees>
    sendMessage: Action<typeof sendMessage>
    removeDeliveredMessage: Action<typeof removeDeliveredMessage>
    removeExpiredMessage: Action<typeof removeExpiredMessage>
    onBack: () => void
}

const Send: React.FC<IAddNewToken> = ({
    account,
    tonWalletState,
    deliveredMessages,
    expiredMessages,
    prepareMessage,
    estimateFees,
    sendMessage,
    onBack,
}) => {
    const [localStep, setLocalStep] = useState(LocalStep.ENTER_ADDRESS)
    const [messageParams, setMessageParams] = useState<MessageToPrepare>()
    const [pendingTransaction, setPendingTransaction] = useState<nt.PendingTransaction>()

    const showSendingMessage = (pendingTransaction: nt.PendingTransaction) => {
        const close = () => {
            setPendingTransaction(undefined)
            setLocalStep(LocalStep.ENTER_ADDRESS)
            onBack()
        }

        const isDone =
            deliveredMessages.findIndex(
                (item) => item.pendingTransaction.bodyHash == pendingTransaction.bodyHash
            ) >= 0
        if (isDone) {
            return <TransactionSent onBack={close} />
        }

        const isFailed =
            expiredMessages.findIndex((item) => item.bodyHash == pendingTransaction.bodyHash) >= 0
        if (isFailed) {
            return <TransactionExpired onBack={close} />
        }

        return <TransactionSending onBack={close} />
    }

    return (
        <>
            {localStep == LocalStep.ENTER_ADDRESS && (
                <EnterAddress
                    account={account}
                    tonWalletState={tonWalletState}
                    onBack={onBack}
                    onSubmit={(params) => {
                        setMessageParams(params)
                        setLocalStep(LocalStep.ENTER_PASSWORD)
                    }}
                />
            )}
            {localStep == LocalStep.ENTER_PASSWORD && messageParams && (
                <EnterPassword
                    account={account}
                    params={messageParams}
                    prepareMessage={prepareMessage}
                    estimateFees={estimateFees}
                    sendMessage={sendMessage}
                    onSubmit={(pendingTransaction) => {
                        setPendingTransaction(pendingTransaction)
                        setLocalStep(LocalStep.SENDING)
                    }}
                    onBack={() => {
                        setLocalStep(LocalStep.ENTER_ADDRESS)
                    }}
                />
            )}
            {localStep == LocalStep.SENDING &&
                pendingTransaction &&
                showSendingMessage(pendingTransaction)}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    deliveredMessages: store.app.deliveredMessages,
    expiredMessages: store.app.expiredMessages,
})

export default connect(mapStateToProps, {
    prepareMessage,
    estimateFees,
    sendMessage,
    removeDeliveredMessage,
    removeExpiredMessage,
})(Send)
