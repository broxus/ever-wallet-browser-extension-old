import * as React from 'react'
import { useIntl } from 'react-intl'

import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'
import { prepareKey } from '@popup/utils'

import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import { Select } from '@popup/components/Select'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { convertCurrency, convertPublicKey, convertTokenName, convertTons } from '@shared/utils'
import AssetIcon, { TonAssetIcon } from '@popup/components/AssetIcon'

import './style.scss'

export type MessageAmount =
    | nt.EnumItem<
          'ton_wallet',
          {
              amount: string
          }
      >
    | nt.EnumItem<
          'token_wallet',
          {
              amount: string
              attachedAmount: string
              symbol: string
              decimals: number
              rootTokenContract: string
              old: boolean
          }
      >

type Props = {
    keyEntries: nt.KeyStoreEntry[]
    keyEntry: nt.KeyStoreEntry
    amount?: MessageAmount
    recipient?: string
    fees?: string
    error?: string
    disabled: boolean
    showHeading?: boolean
    transactionId?: string
    onSubmit(password: nt.KeyPassword): void
    onBack(): void
    onChangeKeyEntry(keyEntry: nt.KeyStoreEntry): void
}

export function EnterPassword({
    keyEntries,
    keyEntry,
    amount,
    recipient,
    fees,
    error,
    disabled,
    showHeading = true,
    transactionId,
    onSubmit,
    onBack,
    onChangeKeyEntry,
}: Props): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()

    const [submitted, setSubmitted] = React.useState(false)
    const [password, setPassword] = React.useState<string>('')

    const passwordRef = React.useRef<HTMLInputElement>(null)

    const keyEntriesOptions = keyEntries.map((key) => ({
        label: key.name,
        value: key.publicKey,
        ...key,
    }))

    const changeKeyEntry = (_: string, option: any) => {
        if (option != null) {
            const value = { ...option }
            delete value.label
            delete value.value
            onChangeKeyEntry(value)
        }
    }

    const trySubmit = async () => {
        let context

        if (recipient && amount) {
            if (amount.type === 'token_wallet') {
                context = {
                    address: recipient,
                    amount: amount.data.attachedAmount,
                }
            } else if (amount.type === 'ton_wallet') {
                context = {
                    address: recipient,
                    amount: amount.data.amount,
                }
            }
        }

        onSubmit(prepareKey(keyEntry, password, context))
        setSubmitted(true)
    }

    const onKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        const keyCode = event.which || event.keyCode
        if (keyCode === 13) {
            await trySubmit()
        }
    }

    React.useEffect(() => {
        if (passwordRef.current) {
            passwordRef.current.scrollIntoView()
        }
    }, [])

    return (
        <div className="enter-password">
            {showHeading && (
                <header className="enter-password__header">
                    <h2 className="enter-password__header-title noselect">
                        {intl.formatMessage({ id: 'APPROVE_SEND_MESSAGE_APPROVAL_TITLE' })}
                    </h2>
                </header>
            )}
            <div className="enter-password__wrapper">
                <div>
                    <div className="enter-password__confirm-details">
                        {recipient != null && (
                            <div key="recipient" className="enter-password__confirm-details-param">
                                <span className="enter-password__confirm-details-param-desc">
                                    {intl.formatMessage({
                                        id: 'APPROVE_SEND_MESSAGE_TERM_RECIPIENT',
                                    })}
                                </span>
                                <span className="enter-password__confirm-details-param-value">
                                    {recipient}
                                </span>
                            </div>
                        )}
                        {transactionId !== undefined && (
                            <div
                                key="transactionId"
                                className="enter-password__confirm-details-param"
                            >
                                <span className="enter-password__confirm-details-param-desc">
                                    {intl.formatMessage({
                                        id: 'APPROVE_SEND_MESSAGE_TERM_TRANSACTION_ID',
                                    })}
                                </span>
                                <span className="enter-password__confirm-details-param-value">
                                    {transactionId}
                                </span>
                            </div>
                        )}
                        {amount?.type == 'token_wallet' && (
                            <div className="enter-password__confirm-details-param">
                                <span className="enter-password__confirm-details-param-desc">
                                    {intl.formatMessage({
                                        id: 'APPROVE_SEND_MESSAGE_TERM_AMOUNT',
                                    })}
                                </span>
                                <span className="enter-password__confirm-details-param-value enter-password__confirm-details-param-value--amount">
                                    <AssetIcon
                                        type={'token_wallet'}
                                        address={amount.data.rootTokenContract}
                                        old={amount.data.old}
                                        className="root-token-icon noselect"
                                    />
                                    <span className="token-amount-text ">
                                        {convertCurrency(amount.data.amount, amount.data.decimals)}
                                    </span>
                                    &nbsp;
                                    <span className="root-token-name">
                                        {convertTokenName(amount.data.symbol)}
                                    </span>
                                </span>
                            </div>
                        )}

                        {amount != null && (
                            <div className="enter-password__confirm-details-param">
                                <span className="enter-password__confirm-details-param-desc">
                                    {amount.type == 'ton_wallet'
                                        ? intl.formatMessage({
                                              id: 'APPROVE_SEND_MESSAGE_TERM_AMOUNT',
                                          })
                                        : intl.formatMessage({
                                              id: 'APPROVE_SEND_MESSAGE_TERM_ATTACHED_AMOUNT',
                                          })}
                                </span>
                                <span className="enter-password__confirm-details-param-value enter-password__confirm-details-param-value--amount">
                                    <TonAssetIcon className="root-token-icon noselect" />
                                    {convertTons(
                                        amount.type == 'ton_wallet'
                                            ? amount.data.amount
                                            : amount.data.attachedAmount
                                    )}
                                    &nbsp;{NATIVE_CURRENCY}
                                </span>
                            </div>
                        )}

                        <div key="convertedFees" className="enter-password__confirm-details-param">
                            <span className="enter-password__confirm-details-param-desc">
                                {intl.formatMessage({
                                    id: 'APPROVE_SEND_MESSAGE_TERM_BLOCKCHAIN_FEE',
                                })}
                            </span>
                            <span className="enter-password__confirm-details-param-value enter-password__confirm-details-param-value--amount">
                                <TonAssetIcon className="root-token-icon noselect" />
                                {fees != null
                                    ? `~${convertTons(fees)} ${NATIVE_CURRENCY}`
                                    : intl.formatMessage({
                                          id: 'CALCULATING_HINT',
                                      })}
                            </span>
                        </div>
                    </div>
                    {keyEntries.length > 1 ? (
                        <Select
                            className="enter-password__field-select"
                            options={keyEntriesOptions}
                            value={keyEntry.publicKey}
                            onChange={changeKeyEntry}
                        />
                    ) : null}
                    {keyEntry.signerName != 'ledger_key' ? (
                        <>
                            <Input
                                className="enter-password__field-password"
                                label={intl.formatMessage({
                                    id: 'APPROVE_SEND_MESSAGE_PASSWORD_FIELD_PLACEHOLDER',
                                })}
                                type="password"
                                disabled={disabled}
                                value={password}
                                onKeyDown={onKeyDown}
                                onChange={(e) => setPassword(e.target.value)}
                                ref={passwordRef}
                            />
                            <div className="enter-password__field-hint">
                                {intl.formatMessage(
                                    { id: 'APPROVE_SEND_MESSAGE_PASSWORD_FIELD_HINT' },
                                    {
                                        name:
                                            accountability.masterKeysNames[keyEntry.masterKey] ||
                                            convertPublicKey(keyEntry.masterKey),
                                    }
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="enter-password__ledger-confirm">
                            {intl.formatMessage({
                                id: 'APPROVE_SEND_MESSAGE_APPROVE_WITH_LEDGER_HINT',
                            })}
                        </div>
                    )}
                    {error && <div className="enter-password__error-message">{error}</div>}
                </div>
                <div className="enter-password__footer">
                    <div className="enter-password__footer-button-back">
                        <Button
                            white
                            text={intl.formatMessage({
                                id: 'BACK_BTN_TEXT',
                            })}
                            onClick={onBack}
                            disabled={submitted && !error}
                        />
                    </div>
                    <Button
                        text={intl.formatMessage({
                            id: 'CONFIRM_TRANSACTION_BTN_TEXT',
                        })}
                        onClick={trySubmit}
                        disabled={
                            disabled ||
                            (keyEntry.signerName != 'ledger_key' && password.length === 0) ||
                            (submitted && !error)
                        }
                    />
                </div>
            </div>
        </div>
    )
}
