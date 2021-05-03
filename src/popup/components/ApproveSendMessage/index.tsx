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
                    This site wants to spend your TON
                </h3>
                <p className="connect-wallet__spend-top-panel__comment">
                    Do you trust this site? By granting this permission, you’re allowing
                    {origin} to withdraw your WTON and automate transactions for you.
                </p>
            </div>
            <div className="connect-wallet__spend-details">
                <p className="connect-wallet__spend-details-title">Transaction details</p>
                <div className="connect-wallet__details__description">
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">Fee</span>
                        <span className="connect-wallet__details__description-param-value">
                            {convertTons(fees)} TON
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
                        <span className="connect-wallet__details__description-param-desc">To</span>
                        <span className="connect-wallet__details__description-param-value">
                            {convertAddress(recipient)}
                        </span>
                    </div>
                </div>
                <p className="connect-wallet__spend-details-title">Data</p>
                <div className="connect-wallet__details__data">{JSON.stringify(payload)}</div>
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
