import * as React from 'react'
import Select from 'react-select'

import * as nt from '@nekoton'
import { convertFees, Fees, prepareKey } from '@popup/utils'
import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import { selectStyles } from '@popup/constants/selectStyle'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { convertPublicKey } from '@shared/utils'

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

    return (
        <>
            <div>
                {showHeading && (
                    <h2 className="send-screen__form-title nos noselect">Confirm message</h2>
                )}
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
                            {convertedFees ? `~${convertedFees.total} TON` : 'calculating...'}
                        </span>
                    </div>
                </div>
                {keyEntries.length > 1 ? (
                    <Select
                        className="send-screen__form-input"
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
                            className="send-screen__form-password"
                            label={'Password...'}
                            type="password"
                            disabled={disabled}
                            value={password}
                            onChange={setPassword}
                        />
                        <div className="send-screen__form-field-hint">
                            Enter password from seed: {accountability.masterKeysNames[keyEntry.masterKey] || convertPublicKey(keyEntry.masterKey)}
                        </div>
                    </>
                ) : (
                    <div
                        className="send-screen__form-tx-details-param-desc"
                        style={{ marginBottom: '24px' }}
                    >
                        Please confirm the transaction with your Ledger
                    </div>
                )}
                {error && <div className="send-screen__form-error">{error}</div>}
            </div>
            <div className="send-screen__footer">
                <div className="send-screen__footer-button-back">
                    <Button text="Back" white onClick={onBack} />
                </div>
                <Button
                    text="Confirm transaction"
                    onClick={trySubmit}
                    disabled={
                        disabled || (keyEntry.signerName != 'ledger_key' && password.length === 0)
                    }
                />
            </div>
        </>
    )
}
