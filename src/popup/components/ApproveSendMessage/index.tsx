import React, { useState } from 'react'
import { convertTons, findAccountByAddress } from '@shared/utils'
import { PendingApproval } from '@shared/approvalApi'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import SlidingPanel from '@popup/components/SlidingPanel'
import EnterPassword from '@popup/components/EnterPassword'
import WebsiteIcon from '@popup/components/WebsiteIcon'
import UserAvatar from '@popup/components/UserAvatar'

interface IApproveSendMessage {
    approval: PendingApproval<'sendMessage'>
    accountEntries: { [publicKey: string]: nt.AssetsList[] }
    accountContractStates: { [address: string]: nt.ContractState }
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    onSubmit: (password: nt.KeyPassword) => void
    onReject: () => void
}

const ApproveSendMessage: React.FC<IApproveSendMessage> = ({
    approval,
    accountEntries,
    accountContractStates,
    storedKeys,
    checkPassword,
    onReject,
    onSubmit,
}) => {
    const { origin } = approval
    const { sender, recipient, amount, fees, payload } = approval.requestData

    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false)

    const account = findAccountByAddress(accountEntries, sender)
    if (account == null) {
        !inProcess && onReject()
        setInProcess(true)
        return null
    }

    const contractState = accountContractStates[account.tonWallet.address]
    const balance = new Decimal(contractState?.balance || '0')

    console.log(contractState, balance, sender)

    const trySubmit = async (password: string) => {
        const keyEntry = storedKeys[account.tonWallet.publicKey]
        if (keyEntry == null) {
            setError('Key entry not found')
            return
        }

        setInProcess(true)
        try {
            const keyPassword: nt.KeyPassword = {
                type: keyEntry.signerName,
                data: {
                    publicKey: keyEntry.publicKey,
                    password,
                },
            }

            const isValid = await checkPassword(keyPassword)
            if (isValid) {
                onSubmit(keyPassword)
            } else {
                setError('Invalid password')
            }
        } catch (e) {
            setError(e.toString())
        } finally {
            setInProcess(false)
        }
    }

    return (
        <div className="connect-wallet">
            <div className="connect-wallet__spend-top-panel">
                <div className="connect-wallet__spend-top-panel__network">
                    <div className="connect-wallet__address-entry">
                        <UserAvatar address={account.tonWallet.address} small />
                        <div className="connect-wallet__spend-top-panel__account">
                            {account?.name}
                        </div>
                    </div>
                    <div className="connect-wallet__network" style={{ marginBottom: '0' }}>
                        Mainnet
                    </div>
                </div>
                <div className="connect-wallet__spend-top-panel__site">
                    <WebsiteIcon origin={origin} />
                    <div className="connect-wallet__address-entry">{origin}</div>
                </div>
                <h3 className="connect-wallet__spend-top-panel__header noselect">
                    Send internal message
                </h3>
            </div>
            <div className="connect-wallet__spend-details">
                <div className="connect-wallet__details__description">
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Recipient
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            {recipient}
                        </span>
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Amount
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            {convertTons(amount)} TON
                        </span>
                        {balance.lessThan(amount) && (
                            <div
                                className="check-seed__content-error"
                                style={{ marginBottom: '16px', marginTop: '-12px' }}
                            >
                                Insufficient funds
                            </div>
                        )}
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Blockchain fee
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            ~{convertTons(fees)} TON
                        </span>
                    </div>
                    {payload && (
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Data
                            </span>
                            <div className="connect-wallet__details__description-param-data">
                                <div className="connect-wallet__details__description-param-data__method">
                                    <span>Method:</span>
                                    <span>{payload.method}</span>
                                </div>
                                {Object.entries(payload.params).map(([key, value], i) => (
                                    <div
                                        className="connect-wallet__details__description-param-data__block"
                                        key={i}
                                    >
                                        <div className="connect-wallet__details__description-param-data__block--param-name">
                                            {key}
                                        </div>
                                        {value instanceof Array ? (
                                            <div className="connect-wallet__details__description-param-data__block--value">
                                                {JSON.stringify(value, undefined, 4)}
                                            </div>
                                        ) : (
                                            <div className="connect-wallet__details__description-param-data__block--value">
                                                {value.toString()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="connect-wallet__buttons">
                <div className="connect-wallet__buttons-button">
                    <Button type="button" white text="Reject" onClick={onReject} />
                </div>
                <div className="connect-wallet__buttons-button">
                    <Button
                        type="submit"
                        text="Send"
                        disabled={balance.lessThan(amount)}
                        onClick={() => {
                            setPasswordModalVisible(true)
                        }}
                    />
                </div>
            </div>
            <SlidingPanel
                isOpen={passwordModalVisible}
                onClose={() => setPasswordModalVisible(false)}
            >
                <EnterPassword
                    disabled={inProcess}
                    error={error}
                    handleNext={trySubmit}
                    handleBack={() => setPasswordModalVisible(false)}
                />
            </SlidingPanel>
        </div>
    )
}

export default ApproveSendMessage
