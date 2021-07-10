import * as React from 'react'
import Decimal from 'decimal.js'
import { useForm } from 'react-hook-form'
import Select from 'react-select'

import * as nt from '@nekoton'
import { Fees } from '@popup/utils'
import { Checkbox } from '@popup/components/Checkbox'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Message, EnterPassword } from '@popup/components/Send/components'
import UserAvatar from '@popup/components/UserAvatar'
import { selectStyles } from '@popup/constants/selectStyle'
import {
    TransferMessageToPrepare,
    TokenMessageToPrepare,
    WalletMessageToSend,
} from '@shared/backgroundApi'
import {
    amountPattern,
    convertCurrency,
    currentUtime,
    parseCurrency,
    parseTons,
    SelectedAsset,
    TokenWalletState,
} from '@shared/utils'

enum PrepareStep {
    ENTER_ADDRESS,
    ENTER_PASSWORD,
}

type MessageParams = {
    recipient: string
    amount: string
    comment?: string
}

type Props = {
    accountName: string
    tonWalletAsset: nt.TonWalletAsset
    tokenWalletAssets: nt.TokenWalletAsset[]
    defaultAsset: SelectedAsset
    keyEntries: nt.KeyStoreEntry[]
    tonWalletState: nt.ContractState
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    estimateFees: (params: TransferMessageToPrepare) => Promise<string>
    prepareMessage: (
        params: TransferMessageToPrepare,
        password: nt.KeyPassword
    ) => Promise<nt.SignedMessage>
    prepareTokenMessage: (
        owner: string,
        rootTokenContract: string,
        params: TokenMessageToPrepare
    ) => Promise<nt.InternalMessage>
    onSubmit: (message: WalletMessageToSend) => void
    onBack: () => void
}

export function PrepareMessage({
    accountName,
    tonWalletAsset,
    tokenWalletAssets,
    defaultAsset,
    keyEntries,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    estimateFees,
    prepareMessage,
    prepareTokenMessage,
    onSubmit,
    onBack,
}: Props): JSX.Element {
    const [localStep, setLocalStep] = React.useState(PrepareStep.ENTER_ADDRESS)
    const [inProcess, setInProcess] = React.useState(false)
    const [error, setError] = React.useState<string>()
    const [fees, setFees] = React.useState<Fees>()
    const [messageParams, setMessageParams] = React.useState<Message>()
    const [messageToPrepare, setMessageToPrepare] = React.useState<TransferMessageToPrepare>()
    const [notifyReceiver, setNotifyReceiver] = React.useState<boolean>(false)
    const [selectedAsset, setSelectedAsset] = React.useState<string>(
        defaultAsset.type == 'ton_wallet' ? '' : defaultAsset.data.rootTokenContract
    )
    const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry>(keyEntries[0])

    const { register, setValue, handleSubmit, errors } = useForm<MessageParams>()

    let defaultValue: { value: string; label: string } = {
        value: '',
        label: 'TON',
    }
    const options: { value: string; label: string }[] = [defaultValue]
    for (const { rootTokenContract } of tokenWalletAssets) {
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
    }
    else {
        balance = new Decimal(tokenWalletStates[selectedAsset]?.balance || '0')

        const symbol = knownTokens[selectedAsset] as nt.Symbol | undefined
        decimals = symbol?.decimals
        currencyName = symbol?.name
    }

    const walletInfo = nt.getContractTypeDetails(tonWalletAsset.contractType)

    const submitMessageParams = async (data: MessageParams) => {
        let attachedAmount: string | undefined = undefined

        let messageToPrepare: TransferMessageToPrepare
        if (selectedAsset.length == 0) {
            messageToPrepare = {
                publicKey: selectedKey.publicKey,
                recipient: nt.repackAddress(data.recipient), //shouldn't throw exceptions due to higher level validation
                amount: parseTons(data.amount),
                payload: data.comment ? nt.encodeComment(data.comment) : undefined,
            }
        }
        else {
            if (decimals == null) {
                setError('Invalid decimals')
                return
            }

            const internalMessage = await prepareTokenMessage(
                tonWalletAsset.address,
                selectedAsset,
                {
                    amount: parseCurrency(data.amount, decimals),
                    recipient: data.recipient,
                    notifyReceiver,
                }
            )

            attachedAmount = internalMessage.amount

            messageToPrepare = {
                publicKey: selectedKey.publicKey,
                recipient: internalMessage.destination,
                amount: internalMessage.amount,
                payload: internalMessage.body,
            }
        }

        setFees(undefined)
        estimateFees(messageToPrepare)
            .then((transactionFees) => {
                setFees({
                    transactionFees,
                    attachedAmount,
                })
            })
            .catch(console.error)

        setMessageToPrepare(messageToPrepare)
        setMessageParams(data)
        setLocalStep(PrepareStep.ENTER_PASSWORD)
    }

    const submitPassword = async (password: nt.KeyPassword) => {
        if (messageToPrepare == null || inProcess) {
            return
        }

        setError(undefined)
        setInProcess(true)
        try {
            const signedMessage = await prepareMessage(messageToPrepare, password)
            await onSubmit({
                signedMessage,
                info: {
                    createdAt: currentUtime(),
                    amount: messageToPrepare.amount,
                    recipient: messageToPrepare.recipient,
                },
            })
        } catch (e) {
            setError(e.toString())
            setInProcess(false)
        } finally {
            setMessageParams(undefined)
            setMessageToPrepare(undefined)
        }
    }

    React.useEffect(() => {
        if (messageParams && localStep === PrepareStep.ENTER_ADDRESS) {
            setValue('amount', messageParams.amount)
            setValue('recipient', messageParams.recipient)
            setValue('comment', messageParams.comment)
        }
    }, [localStep])

    React.useEffect(() => {
        if (messageParams != null) {
            submitMessageParams(messageParams)
        }
    }, [selectedKey])

    return (
        <div className="send-screen__content">
            <div className="send-screen__account_details">
                <UserAvatar address={tonWalletAsset.address} small />{' '}
                <span className="send-screen__account_details-title">{accountName}</span>
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
                        {selectedAsset.length > 0 && (
                            <div className="send-screen__form-checkbox">
                                <Checkbox checked={notifyReceiver} onChange={setNotifyReceiver} />
                                <span className="send-screen__form-checkbox-label">
                                    Notify receiver
                                </span>
                            </div>
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
                    keyEntries={keyEntries}
                    keyEntry={selectedKey}
                    currencyName={currencyName}
                    params={messageParams}
                    fees={fees}
                    error={error}
                    disabled={inProcess}
                    onSubmit={submitPassword}
                    onBack={() => {
                        setLocalStep(PrepareStep.ENTER_ADDRESS)
                    }}
                    onChangeKeyEntry={setKey}
                />
            )}
        </div>
    )
}
