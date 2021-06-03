import React, { useState } from 'react'
import cn from 'classnames'
import { convertAddress, convertTons } from '@shared/utils'
import { PendingApproval } from '@shared/approvalApi'
import { prepareKey } from '@popup/utils'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'

import Arrow from '@popup/img/arrow.svg'
import EnterPassword from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import UserAvatar from '@popup/components/UserAvatar'

interface IApproveContractInteraction {
    approval: PendingApproval<'callContractMethod'>
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    onSubmit: (password: nt.KeyPassword) => void
    onReject: () => void
}

const ApproveContractInteraction: React.FC<IApproveContractInteraction> = ({
    approval,
    storedKeys,
    checkPassword,
    onSubmit,
    onReject,
}) => {
    const { origin } = approval
    const { publicKey, recipient, payload } = approval.requestData

    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false)

    const trySubmit = async (password: string) => {
        const keyEntry = storedKeys[publicKey]
        if (keyEntry == null) {
            setError('Key entry not found')
            return
        }

        setInProcess(true)
        try {
            const keyPassword = prepareKey(keyEntry, password)
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
            <div className="connect-wallet__top-panel">
                {/*<div className="connect-wallet__network">Mainnet</div>
                <div className="connect-wallet__address">
                    <div className="connect-wallet__address-entry">
                        <UserAvatar address={account.tonWallet.address} small />
                        <div className="connect-wallet__address-entry">{account.name}</div>
                    </div>
                    <img src={Arrow} alt="" />
                    <div className="connect-wallet__address-entry">
                        <UserAvatar address={account.tonWallet.address} small />
                        <div className="connect-wallet__address-entry">
                            {convertAddress(account?.tonWallet.address)}
                        </div>
                    </div>
                </div>*/}
                <p className="connect-wallet__top-panel__title">Contract interaction</p>
                <p className="connect-wallet__top-panel__source">{origin}</p>
            </div>

            <div className="connect-wallet__details">
                <div className="connect-wallet__details__data">
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Recipient
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            {convertAddress(recipient)}
                        </span>
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Method
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            {payload.method}
                        </span>
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Params
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            {JSON.stringify(payload.params, undefined, 4)}
                        </span>
                    </div>
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

export default ApproveContractInteraction
