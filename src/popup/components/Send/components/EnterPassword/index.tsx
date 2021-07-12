import * as React from 'react'
import Select from 'react-select'

import * as nt from '@nekoton'
import { convertFees, Fees, prepareKey } from '@popup/utils'
import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import { selectStyles } from '@popup/constants/selectStyle'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { convertPublicKey } from '@shared/utils'

import './style.scss'

export type Message = {
    amount: string
    comment?: string
    recipient: string
}

type Props = {
    keyEntries: nt.KeyStoreEntry[]
    keyEntry: nt.KeyStoreEntry
    params?: Message
    fees?: Fees
    currencyName?: string
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
    params,
    fees,
    currencyName,
    error,
    disabled,
    showHeading = true,
    transactionId,
    onSubmit,
    onBack,
    onChangeKeyEntry,
}: Props): JSX.Element {
    const accountability = useAccountability()

    const [password, setPassword] = React.useState<string>('')

    const convertedFees = fees != null ? convertFees(fees) : undefined

    const changeKeyEntry = (value: nt.KeyStoreEntry | null) => {
        if (value != null) {
            onChangeKeyEntry(value)
        }
    }

    const trySubmit = async () => {
        onSubmit(prepareKey(keyEntry, password))
    }

    const onKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === 13) {
            await trySubmit()
        }
    }

    return (
        <div className="enter-password">
            {showHeading && (
                <header className="enter-password__header">
                    <h2 className="enter-password__header-title noselect">Confirm message</h2>
                </header>
            )}
            <div className="enter-password__wrapper">
                <div>
                    <div className="enter-password__confirm-details">
                        {params?.recipient !== undefined && (
                            <div key="recipient" className="enter-password__confirm-details-param">
                                <span className="enter-password__confirm-details-param-desc">
                                    Recipient
                                </span>
                                <span className="enter-password__confirm-details-param-value">
                                    {params?.recipient}
                                </span>
                            </div>
                        )}
                        {transactionId !== undefined && (
                            <div
                                key="transactionId"
                                className="enter-password__confirm-details-param"
                            >
                                <span className="enter-password__confirm-details-param-desc">
                                    Transaction Id
                                </span>
                                <span className="enter-password__confirm-details-param-value">
                                    {transactionId}
                                </span>
                            </div>
                        )}
                        {params?.amount !== undefined && (
                            <div key="amount" className="enter-password__confirm-details-param">
                                <span className="enter-password__confirm-details-param-desc">
                                    Amount
                                </span>
                                <span className="enter-password__confirm-details-param-value">
                                    {params?.amount} {currencyName}
                                </span>
                            </div>
                        )}
                        <div key="convertedFees" className="enter-password__confirm-details-param">
                            <span className="enter-password__confirm-details-param-desc">
                                Blockchain fee
                            </span>
                            <span className="enter-password__confirm-details-param-value">
                                {convertedFees?.total !== undefined
                                    ? `~${convertedFees.total} TON`
                                    : 'calculating...'}
                            </span>
                        </div>
                    </div>
                    {keyEntries.length > 1 ? (
                        <Select
                            className="enter-password__field-select"
                            styles={selectStyles}
                            options={keyEntries}
                            value={keyEntry}
                            formatOptionLabel={(value) => value.name}
                            onChange={changeKeyEntry}
                        />
                    ) : null}
                    {keyEntry.signerName != 'ledger_key' ? (
                        <>
                            <Input
                                className="enter-password__field-password"
                                label="Password..."
                                type="password"
                                disabled={disabled}
                                value={password}
                                onKeyDown={onKeyDown}
                                onChange={setPassword}
                            />
                            <div className="enter-password__field-hint">
                                Enter password for seed:{' '}
                                {accountability.masterKeysNames[keyEntry.masterKey] ||
                                    convertPublicKey(keyEntry.masterKey)}
                            </div>
                        </>
                    ) : (
                        <div className="enter-password__confirm-details-param-desc">
                            Please confirm the transaction with your Ledger
                        </div>
                    )}
                    {error && <div className="enter-password__error-message">{error}</div>}
                </div>
                <div className="enter-password__footer">
                    <div className="enter-password__footer-button-back">
                        <Button text="Back" white onClick={onBack} />
                    </div>
                    <Button
                        text="Confirm transaction"
                        onClick={trySubmit}
                        disabled={
                            disabled ||
                            (keyEntry.signerName != 'ledger_key' && password.length === 0)
                        }
                    />
                </div>
            </div>
        </div>
    )
}
