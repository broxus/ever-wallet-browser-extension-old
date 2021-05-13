import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Decimal from 'decimal.js'
import { selectStyles } from '@popup/constants/selectStyle'
import {
    amountPattern,
    convertCurrency,
    convertTons,
    parseCurrency,
    parseTons,
    SelectedAsset,
    TokenWalletState,
} from '@shared/utils'
import {
    MessageToPrepare,
    SwapBackMessageToPrepare,
    TokenMessageToPrepare,
} from '@shared/approvalApi'
import * as nt from '@nekoton'

import Select from 'react-select'
import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import TransactionProgress from '@popup/components/TransactionProgress'
import UserAvatar from '@popup/components/UserAvatar'

import './style.scss'

enum PrepareStep {
    ENTER_ADDRESS,
    ENTER_PASSWORD,
}

type IEnterPassword = {
    keyEntry: nt.KeyStoreEntry
    params?: IMessage
    fees?: string
    currencyName?: string
    error?: string
    disabled: boolean
    onSubmit: (password: nt.KeyPassword) => void
    onBack: () => void
}

const EnterPassword: React.FC<IEnterPassword> = ({
    keyEntry,
    params,
    fees,
    currencyName,
    error,
    disabled,
    onSubmit,
    onBack,
}) => {
    const [password, setPassword] = useState<string>('')

    const trySubmit = async () => {
        const keyPassword: nt.KeyPassword =
            keyEntry.signerName != 'ledger_key'
                ? {
                    type: keyEntry.signerName,
                    data: {
                        publicKey: keyEntry.publicKey,
                        password,
                    },
                }
                : {
                    type:  keyEntry.signerName,
                    data: {
                        publicKey: keyEntry.publicKey,
                    },
                }
        onSubmit(keyPassword)
    }

    return (
        <>
            <h2 className="send-screen__form-title nos noselect">Confirm message</h2>
            <div className="send-screen__form-tx-details">
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Recipient</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {params?.recipient}
                    </span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Amount</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {params?.amount} {currencyName}
                    </span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Blockchain fee</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {fees ? `~${convertTons(fees)} TON` : 'calculating...'}
                    </span>
                </div>

                {/*TODO password form doesn't fit, wait for design update*/}
                {/*{params?.comment && (*/}
                {/*    <div className="send-screen__form-tx-details-param">*/}
                {/*        <span className="send-screen__form-tx-details-param-desc">Comment</span>*/}
                {/*        <span className="send-screen__form-tx-details-param-value">*/}
                {/*            {params?.comment}*/}
                {/*        </span>*/}
                {/*    </div>*/}
                {/*)}*/}
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
    defaultAsset: SelectedAsset
    keyEntry: nt.KeyStoreEntry
    tonWalletState: nt.ContractState
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    estimateFees: (params: MessageToPrepare) => Promise<string>
    prepareMessage: (
        params: MessageToPrepare,
        password: nt.KeyPassword
    ) => Promise<nt.SignedMessage>
    prepareTokenMessage: (
        owner: string,
        rootTokenContract: string,
        params: TokenMessageToPrepare
    ) => Promise<nt.InternalMessage>
    onSubmit: (message: nt.SignedMessage) => void
    onBack: () => void
}

type IMessage = {
    amount: string
    comment?: string
    recipient: string
}

const PrepareMessage: React.FC<IPrepareMessage> = ({
    account,
    defaultAsset,
    keyEntry,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    estimateFees,
    prepareMessage,
    prepareTokenMessage,
    onSubmit,
    onBack,
}) => {
    const [localStep, setLocalStep] = useState(PrepareStep.ENTER_ADDRESS)
    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    const [messageToPrepare, setMessageToPrepare] = useState<MessageToPrepare>()
    const [fees, setFees] = useState<string>()
    const [messageParams, setMessageParams] = useState<IMessage>()
    const [selectedAsset, setSelectedAsset] = useState<string>(
        defaultAsset.type == 'ton_wallet' ? '' : defaultAsset.data.rootTokenContract
    )

    const { register, setValue, handleSubmit, errors } = useForm<MessageParams>()

    let defaultValue: { value: string; label: string } = { value: '', label: 'TON' }
    const options: { value: string; label: string }[] = [defaultValue]
    for (const { rootTokenContract } of account.tokenWallets) {
        const symbol = knownTokens[rootTokenContract]

        options.push({
            value: rootTokenContract,
            label: symbol?.name || 'Unknown',
        })

        if (
            defaultAsset.type == 'token_wallet' &&
            defaultAsset.data.rootTokenContract == rootTokenContract
        ) {
            defaultValue = options[options.length - 1]
        }
    }

    let balance: Decimal
    let decimals: number | undefined
    let currencyName: string | undefined
    if (selectedAsset.length == 0) {
        balance = new Decimal(tonWalletState?.balance || '0')
        decimals = 9
        currencyName = 'TON'
    } else {
        balance = new Decimal(tokenWalletStates[selectedAsset]?.balance || '0')

        const symbol = knownTokens[selectedAsset] as nt.Symbol | undefined
        decimals = symbol?.decimals
        currencyName = symbol?.name
    }

    const walletInfo = nt.getContractTypeDetails(account.tonWallet.contractType)

    useEffect(() => {
        if (messageParams && localStep === PrepareStep.ENTER_ADDRESS) {
            setValue('amount', messageParams.amount)
            setValue('recipient', messageParams.recipient)
            setValue('comment', messageParams.comment)
        }
    }, [localStep])

    const submitMessageParams = async (data: MessageParams) => {
        let messageToPrepare: MessageToPrepare
        if (selectedAsset.length == 0) {
            messageToPrepare = {
                recipient: data.recipient,
                amount: parseTons(data.amount),
                payload: data.comment ? nt.encodeComment(data.comment) : undefined,
            }
        } else {
            if (decimals == null) {
                setError('Invalid decimals')
                return
            }

            const internalMessage = await prepareTokenMessage(
                account.tonWallet.address,
                selectedAsset,
                {
                    amount: parseCurrency(data.amount, decimals),
                    recipient: data.recipient,
                }
            )

            messageToPrepare = {
                recipient: internalMessage.destination,
                amount: internalMessage.amount,
                payload: internalMessage.body,
            }
        }

        setFees(undefined)
        estimateFees(messageToPrepare)
            .then((fees) => {
                setFees(fees)
            })
            .catch(console.error)

        setMessageToPrepare(messageToPrepare)
        setMessageParams(data)
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

    return (
        <>
            <div className="send-screen__account_details">
                <UserAvatar address={account.tonWallet.address} small />{' '}
                <span className="send-screen__account_details-title">{account.name}</span>
            </div>
            {localStep === PrepareStep.ENTER_ADDRESS && (
                <div>
                    <h2 className="send-screen__form-title noselect">Send message</h2>
                    <form id="send" onSubmit={handleSubmit(submitMessageParams)}>
                        <Select
                            name="currency"
                            className="send-screen__form-token-dropdown"
                            options={options as any}
                            defaultValue={defaultValue}
                            placeholder={'Select currency'}
                            styles={selectStyles}
                            onChange={(asset) => {
                                asset && setSelectedAsset(asset.value)
                            }}
                        />
                        {decimals != null && (
                            <div className="send-screen__form-balance">
                                <span className="noselect">Your balance:&nbsp;</span>
                                {convertCurrency(balance.toString(), decimals)}
                                &nbsp;
                                {currencyName}
                            </div>
                        )}
                        <Input
                            name="amount"
                            type="text"
                            className="send-screen__form-input"
                            label={'Amount...'}
                            onChange={(value) => setValue('amount', value.trim())}
                            register={register({
                                required: true,
                                pattern: decimals != null ? amountPattern(decimals) : /^\d$/,
                                validate: {
                                    invalidAmount: (value?: string) => {
                                        if (decimals == null) {
                                            return false
                                        }
                                        try {
                                            const current = new Decimal(
                                                parseCurrency(value || '', decimals)
                                            )

                                            if (selectedAsset.length == 0) {
                                                return current.greaterThanOrEqualTo(
                                                    walletInfo.minAmount
                                                )
                                            } else {
                                                return current.greaterThan(0)
                                            }
                                        } catch (e) {
                                            return false
                                        }
                                    },
                                    insufficientBalance: (value?: string) => {
                                        if (decimals == null) {
                                            return false
                                        }
                                        try {
                                            const current = new Decimal(
                                                parseCurrency(value || '', decimals)
                                            )
                                            return current.lessThanOrEqualTo(balance)
                                        } catch (e) {
                                            return false
                                        }
                                    },
                                },
                            })}
                        />
                        {errors.amount && (
                            <div className="send-screen__form-error">
                                {errors.amount.type == 'required' && 'This field is required'}
                                {errors.amount.type == 'invalidAmount' && 'Invalid amount'}
                                {errors.amount.type == 'insufficientBalance' &&
                                    'Insufficient balance'}
                                {errors.amount.type == 'pattern' && 'Invalid format'}
                            </div>
                        )}
                        <Input
                            name="recipient"
                            label={'Recipient address...'}
                            className="send-screen__form-input"
                            onChange={(value) => setValue('recipient', value)}
                            register={register({
                                required: true,
                                pattern: /^(?:-1|0):[0-9a-fA-F]{64}$/,
                                validate: (value: string) =>
                                    value != null && nt.checkAddress(value),
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
                        {selectedAsset.length == 0 && (
                            <Input
                                name="comment"
                                label={'Comment...'}
                                className="send-screen__form-comment"
                                onChange={(value) => setValue('comment', value)}
                                register={register()}
                                type="text"
                            />
                        )}
                    </form>
                    <div style={{ display: 'flex' }}>
                        <div style={{ width: '50%', marginRight: '12px' }}>
                            <Button text={'Back'} onClick={onBack} white />
                        </div>
                        <Button
                            text={'Send'}
                            onClick={handleSubmit(submitMessageParams)}
                            form="send"
                        />
                    </div>
                </div>
            )}
            {localStep == PrepareStep.ENTER_PASSWORD && (
                <EnterPassword
                    keyEntry={keyEntry}
                    currencyName={currencyName}
                    params={messageParams}
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
    defaultAsset?: SelectedAsset
    keyEntry: nt.KeyStoreEntry
    tonWalletState: nt.ContractState
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    estimateFees: (params: MessageToPrepare) => Promise<string>
    prepareMessage: (
        params: MessageToPrepare,
        keyPassword: nt.KeyPassword
    ) => Promise<nt.SignedMessage>
    prepareTokenMessage: (
        owner: string,
        rootTokenContract: string,
        params: TokenMessageToPrepare
    ) => Promise<nt.InternalMessage>
    sendMessage: (params: nt.SignedMessage) => Promise<nt.Transaction>
    onBack: () => void
}

const Send: React.FC<ISend> = ({
    account,
    defaultAsset,
    keyEntry,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    estimateFees,
    prepareMessage,
    prepareTokenMessage,
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
                defaultAsset={
                    defaultAsset || {
                        type: 'ton_wallet',
                        data: {
                            address: account.tonWallet.address,
                        },
                    }
                }
                keyEntry={keyEntry}
                tonWalletState={tonWalletState}
                tokenWalletStates={tokenWalletStates}
                knownTokens={knownTokens}
                prepareMessage={prepareMessage}
                prepareTokenMessage={prepareTokenMessage}
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
