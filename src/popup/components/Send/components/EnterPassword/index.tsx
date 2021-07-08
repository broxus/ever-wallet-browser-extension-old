import * as nt from '@nekoton'
import React, { useState } from 'react'
import { convertFees, Fees, prepareKey } from '@popup/utils'
import Input from '@popup/components/Input'
import Button from '@popup/components/Button'

export type Message = {
    amount: string
    comment?: string
    recipient: string
}

type Props = {
    keyEntry: nt.KeyStoreEntry
    params?: Message
    fees?: Fees
    currencyName?: string
    error?: string
    disabled: boolean
    onSubmit: (password: nt.KeyPassword) => void
    onBack: () => void
}

export function EnterPassword({
    keyEntry,
    params,
    fees,
    currencyName,
    error,
    disabled,
    onSubmit,
    onBack,
}: Props): JSX.Element {
    const [password, setPassword] = useState<string>('')

    const trySubmit = async () => {
        onSubmit(prepareKey(keyEntry, password))
    }

    const convertedFees = fees != null ? convertFees(fees) : undefined

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
                        {convertedFees ? `~${convertedFees.total} TON` : 'calculating...'}
                    </span>
                </div>
            </div>
            {keyEntry.signerName != 'ledger_key' ? (
                <Input
                    className="send-screen__form-comment"
                    label={'Password...'}
                    type="password"
                    disabled={disabled}
                    value={password}
                    onChange={setPassword}
                />
            ) : (
                <div
                    className="send-screen__form-tx-details-param-desc"
                    style={{ marginBottom: '24px' }}
                >
                    Please confirm the transaction with your Ledger
                </div>
            )}
            {error && <div className="send-screen__form-error">{error}</div>}
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onBack} white />
                </div>
                <Button
                    text={'Confirm transaction'}
                    onClick={trySubmit}
                    disabled={
                        disabled || (keyEntry.signerName != 'ledger_key' && password.length === 0)
                    }
                />
            </div>
        </>
    )
}
