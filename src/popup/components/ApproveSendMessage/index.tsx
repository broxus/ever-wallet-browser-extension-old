import React, { useState } from 'react'
import { convertAddress, convertTons } from '@shared/utils'
import { PendingApproval } from '@shared/approvalApi'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import SlidingPanel from '@popup/components/SlidingPanel'
import EnterPassword from '@popup/components/EnterPassword'
import WebsiteIcon from '@popup/components/WebsiteIcon'

import UserPicS from '@popup/img/user-avatar-placeholder-s.svg'

interface IApproveSendMessage {
    approval: PendingApproval<'sendMessage'>
    account: nt.AssetsList
    tonWalletState: nt.ContractState | null
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    onSubmit: (password: nt.KeyPassword) => void
    onReject: () => void
}

const ApproveSendMessage: React.FC<IApproveSendMessage> = ({
    approval,
    account,
    tonWalletState,
    checkPassword,
    onReject,
    onSubmit,
}) => {
    const { origin } = approval
    const { recipient, amount, fees, payload } = approval.requestData

    const balance = convertTons(tonWalletState?.balance || '0').toLocaleString()

    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false)

    const trySubmit = async (password: string) => {
        setInProcess(true)
        try {
            const keyPassword: nt.KeyPassword = {
                type: 'encrypted_key',
                data: {
                    publicKey: account.tonWallet.publicKey,
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
                        <UserPicS />
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
                <h3 className="connect-wallet__spend-top-panel__header">
                    Request to send your WTON
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
                                            <div>{JSON.stringify(value, undefined, 4)}</div>
                                        ) : (
                                            <div>{value}</div>
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
