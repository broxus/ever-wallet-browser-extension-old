import * as React from 'react'
import Decimal from 'decimal.js'
import { useForm } from 'react-hook-form'
import { NATIVE_CURRENCY } from '@shared/constants'
import * as nt from '@nekoton'
import { parseError } from '@popup/utils'

import { Checkbox } from '@popup/components/Checkbox'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Select } from '@popup/components/Select'
import { MessageAmount, EnterPassword } from '@popup/components/Send/components'
import UserAvatar from '@popup/components/UserAvatar'
import {
    TransferMessageToPrepare,
    TokenMessageToPrepare,
    WalletMessageToSend,
} from '@shared/backgroundApi'
import {
    amountPattern,
    convertCurrency,
    parseCurrency,
    parseTons,
    SelectedAsset,
    TokenWalletState,
} from '@shared/utils'

import './style.scss'

enum PrepareStep {
    ENTER_ADDRESS,
    ENTER_PASSWORD,
}

type MessageParams = {
    amount: MessageAmount
    originalAmount: string
    recipient: string
    comment?: string
}

type MessageFromData = {
    amount: string
    comment?: string
    recipient: string
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
    const [fees, setFees] = React.useState<string>()
    const [messageParams, setMessageParams] = React.useState<MessageParams>()
    const [messageToPrepare, setMessageToPrepare] = React.useState<TransferMessageToPrepare>()
    const [notifyReceiver, setNotifyReceiver] = React.useState<boolean>(false)
    const [selectedAsset, setSelectedAsset] = React.useState<string>(
        defaultAsset.type == 'ton_wallet' ? '' : defaultAsset.data.rootTokenContract
    )
    const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry | undefined>(keyEntries[0])

    const { register, setValue, handleSubmit, formState } = useForm<MessageFromData>()

    let defaultValue: { value: string; label: string } = {
        value: '',
        label: NATIVE_CURRENCY,
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
    let old: boolean = false
    if (selectedAsset.length == 0) {
        balance = new Decimal(tonWalletState?.balance || '0')
        decimals = 9
        currencyName = NATIVE_CURRENCY
    } else {
        balance = new Decimal(tokenWalletStates[selectedAsset]?.balance || '0')

        const symbol = knownTokens[selectedAsset] as nt.Symbol | undefined
        decimals = symbol?.decimals
        currencyName = symbol?.name
        if (symbol != null) {
            old = symbol.version != 'Tip3'
        }
    }

    const walletInfo = nt.getContractTypeDetails(tonWalletAsset.contractType)

    const submitMessageParams = async (data: MessageFromData) => {
        if (selectedKey == null) {
            setError('Signer key not selected')
            return
        }

        let messageParams: MessageParams
        let messageToPrepare: TransferMessageToPrepare

        if (selectedAsset.length == 0) {
            messageToPrepare = {
                publicKey: selectedKey.publicKey,
                recipient: nt.repackAddress(data.recipient.trim()), //shouldn't throw exceptions due to higher level validation
                amount: parseTons(data.amount.trim()),
                payload: data.comment ? nt.encodeComment(data.comment) : undefined,
            }
            messageParams = {
                amount: { type: 'ton_wallet', data: { amount: messageToPrepare.amount } },
                originalAmount: data.amount,
                recipient: messageToPrepare.recipient,
                comment: data.comment,
            }
        } else {
            if (decimals == null) {
                setError('Invalid decimals')
                return
            }

            let tokenAmount = parseCurrency(data.amount.trim(), decimals)
            let tokenRecipient = nt.repackAddress(data.recipient.trim())

            const internalMessage = await prepareTokenMessage(
                tonWalletAsset.address,
                selectedAsset,
                {
                    amount: tokenAmount,
                    recipient: tokenRecipient,
                    payload: data.comment ? nt.encodeComment(data.comment) : undefined,
                    notifyReceiver,
                }
            )

            messageToPrepare = {
                publicKey: selectedKey.publicKey,
                recipient: internalMessage.destination,
                amount: internalMessage.amount,
                payload: internalMessage.body,
            }
            messageParams = {
                amount: {
                    type: 'token_wallet',
                    data: {
                        amount: tokenAmount,
                        attachedAmount: internalMessage.amount,
                        symbol: currencyName || '',
                        decimals,
                        rootTokenContract: selectedAsset,
                        old,
                    },
                },
                originalAmount: data.amount,
                recipient: tokenRecipient,
                comment: data.comment,
            }
        }

        setFees(undefined)
        estimateFees(messageToPrepare)
            .then((fees) => setFees(fees))
            .catch(console.error)

        setMessageToPrepare(messageToPrepare)
        setMessageParams(messageParams)
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
                    type: 'transfer',
                    data: {
                        amount: messageToPrepare.amount,
                        recipient: messageToPrepare.recipient,
                    },
                },
            })
        } catch (e: any) {
            setError(parseError(e))
        } finally {
            setInProcess(false)
        }
    }

    const onChangeAsset = (value: string) => {
        if (value != null) {
            setSelectedAsset(value)
        }
    }

    React.useEffect(() => {
        if (messageParams && localStep === PrepareStep.ENTER_ADDRESS) {
            setValue('amount', messageParams.originalAmount)
            setValue('recipient', messageParams.recipient)
            setValue('comment', messageParams.comment)
        }
    }, [localStep])

    React.useEffect(() => {
        if (messageParams != null) {
            submitMessageParams({
                amount: messageParams.originalAmount,
                recipient: messageParams.recipient,
                comment: messageParams.comment,
            }).catch(() => {})
        }
    }, [selectedKey])

    return (
        <div className="prepare-message">
            <header className="prepare-message__header">
                <div className="prepare-message__account_details">
                    <UserAvatar address={tonWalletAsset.address} small />{' '}
                    <span className="prepare-message__account_details-title">{accountName}</span>
                </div>
                {localStep === PrepareStep.ENTER_ADDRESS && (
                    <h2 className="prepare-message__header-title noselect">Send message</h2>
                )}
                {localStep === PrepareStep.ENTER_PASSWORD && (
                    <h2 className="prepare-message__header-title noselect">Confirm message</h2>
                )}
            </header>

            {localStep === PrepareStep.ENTER_ADDRESS && (
                <div className="prepare-message__wrapper">
                    <form id="send" onSubmit={handleSubmit(submitMessageParams)}>
                        <Select
                            options={options}
                            placeholder="Select currency"
                            defaultValue={defaultValue.value}
                            value={selectedAsset}
                            onChange={onChangeAsset}
                        />
                        {decimals != null && (
                            <div className="prepare-message__balance">
                                <span className="noselect">Your balance:&nbsp;</span>
                                {convertCurrency(balance.toString(), decimals)}
                                &nbsp;
                                {currencyName}
                            </div>
                        )}
                        <Input
                            type="text"
                            className="prepare-message__field-input"
                            label="Amount..."
                            autocomplete="off"
                            {...register('amount', {
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
                                        } catch (e: any) {
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
                                        } catch (e: any) {
                                            return false
                                        }
                                    },
                                },
                            })}
                        />

                        {formState.errors.amount && (
                            <div className="prepare-message__error-message">
                                {formState.errors.amount.type == 'required' &&
                                    'This field is required'}
                                {formState.errors.amount.type == 'invalidAmount' &&
                                    'Invalid amount'}
                                {formState.errors.amount.type == 'insufficientBalance' &&
                                    'Insufficient balance'}
                                {formState.errors.amount.type == 'pattern' && 'Invalid format'}
                            </div>
                        )}

                        <Input
                            type="text"
                            label="Recipient address..."
                            autocomplete="off"
                            className="prepare-message__field-input"
                            {...register('recipient', {
                                required: true,
                                validate: (value: string) =>
                                    value != null && nt.checkAddress(value),
                            })}
                        />

                        {formState.errors.recipient && (
                            <div className="prepare-message__error-message">
                                {formState.errors.recipient.type == 'required' &&
                                    'This field is required'}
                                {formState.errors.recipient.type == 'validate' &&
                                    'Invalid recipient'}
                                {formState.errors.recipient.type == 'pattern' && 'Invalid format'}
                            </div>
                        )}

                        <Input
                            label="Comment..."
                            className="prepare-message__field-input"
                            autocomplete="off"
                            type="text"
                            {...register('comment')}
                        />

                        {selectedAsset.length > 0 && (
                            <div className="prepare-message__field-checkbox">
                                <Checkbox checked={notifyReceiver} onChange={setNotifyReceiver} />
                                <span className="prepare-message__field-checkbox-label">
                                    Notify receiver
                                </span>
                            </div>
                        )}
                    </form>

                    <footer className="prepare-message__footer">
                        <div className="prepare-message__footer-button-back">
                            <Button text="Back" white onClick={onBack} />
                        </div>
                        <Button
                            text="Send"
                            form="send"
                            onClick={handleSubmit(submitMessageParams)}
                            disabled={selectedKey == null}
                        />
                    </footer>
                </div>
            )}

            {localStep == PrepareStep.ENTER_PASSWORD && selectedKey != null && (
                <EnterPassword
                    keyEntries={keyEntries}
                    keyEntry={selectedKey}
                    amount={messageParams?.amount}
                    recipient={messageParams?.recipient}
                    fees={fees}
                    error={error}
                    disabled={inProcess}
                    showHeading={false}
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
