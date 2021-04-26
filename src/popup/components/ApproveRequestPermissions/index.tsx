import React, { useState } from 'react'
import { convertTons } from '@utils'
import { PendingApproval } from '../../../shared/models'
import * as nt from '@nekoton'

import Button from '@components/Button'
import Checkbox from '@components/Checkbox'
import WebsiteIcon from '@components/WebsiteIcon'

import TonWalletLogo from '@img/ton-wallet-logo.svg'
import UserPicS from '@img/user-avatar-placeholder-s.svg'

interface IApproveRequestPermissions {
    approval: PendingApproval<'requestPermissions'>
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    onReject: () => void
    onSubmit: () => void
}

enum LocalStep {
    SELECT_ACCOUNT,
    CONFIRM,
    CONNECTING,
}

const ApproveRequestPermissions: React.FC<IApproveRequestPermissions> = ({
    approval,
    account,
    tonWalletState,
    onSubmit,
}) => {
    const { origin } = approval
    const { permissions } = approval.requestData!

    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SELECT_ACCOUNT)

    const [checked, setChecked] = useState(false)
    const [confirmChecked, setConfirmChecked] = useState(true)

    return (
        <div className="connect-wallet-select-account">
            {localStep === LocalStep.SELECT_ACCOUNT && (
                <>
                    <div>
                        <div className="connect-wallet__spend-top-panel__site">
                            <WebsiteIcon origin={origin} />
                            <div className="connect-wallet-select-account-source">{origin}</div>
                        </div>
                        <h2 className="connect-wallet-select-account__title">
                            Select account(s) to connect with Crystal wallet
                        </h2>
                        <div
                            className="connect-wallet-select-account__item"
                            style={{ paddingBottom: '32px' }}
                        >
                            <Checkbox checked={checked} setChecked={setChecked} />
                            <span className="connect-wallet-select-account__item-select">
                                Select all
                            </span>
                        </div>
                        <div
                            className="connect-wallet-select-account__item"
                            style={{ display: 'flex' }}
                        >
                            <Checkbox checked={checked} setChecked={setChecked} />

                            <UserPicS />
                            <div style={{ padding: '0 12px' }}>
                                <div className="account-settings-section-account">
                                    {account?.name}
                                </div>
                                <div className="connect-wallet-select-account__item-value">
                                    {`${convertTons(tonWalletState?.balance || '0')} TON`}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button
                        type="submit"
                        text="Next"
                        disabled={!checked}
                        onClick={() => setLocalStep(LocalStep.CONFIRM)}
                    />
                </>
            )}
            {localStep === LocalStep.CONFIRM && (
                <>
                    <div>
                        <div className="connect-wallet__spend-top-panel__site">
                            <WebsiteIcon origin={origin} />
                            <div className="connect-wallet-select-account-source">{origin}</div>
                        </div>
                        <h2>{`Connected to ${account?.name}`}</h2>
                        <div
                            className="connect-wallet-select-account__item-value"
                            style={{ marginBottom: '32px' }}
                        >
                            {`${convertTons(tonWalletState?.balance || '0')} TON`}
                        </div>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>
                            Allow this site to:
                        </h3>
                        <div
                            className="connect-wallet-select-account__item"
                            style={{ paddingBottom: '16px' }}
                        >
                            <Checkbox checked={confirmChecked} setChecked={setConfirmChecked} />
                            <span className="connect-wallet-select-account__item-select">
                                {JSON.stringify(permissions, undefined, 4)}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                        <div style={{ width: '50%', marginRight: '12px' }}>
                            <Button
                                text={'Back'}
                                onClick={() => setLocalStep(LocalStep.SELECT_ACCOUNT)}
                                white
                            />
                        </div>
                        <Button
                            text={'Connect'}
                            disabled={!confirmChecked}
                            onClick={() => {
                                setLocalStep(LocalStep.CONNECTING)
                                onSubmit()
                            }}
                        />
                    </div>
                </>
            )}
            {localStep === LocalStep.CONNECTING && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                    }}
                >
                    <h2 style={{ marginBottom: '48px' }}>Connecting...</h2>
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-around',
                            alignItems: 'center',
                        }}
                    >
                        <WebsiteIcon origin={origin} />
                        <p className="process">
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                        </p>

                        <TonWalletLogo />
                    </div>
                </div>
            )}
        </div>
    )
}

export default ApproveRequestPermissions
