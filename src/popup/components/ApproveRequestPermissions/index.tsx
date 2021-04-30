import React, { useState } from 'react'
import { convertTons } from '@shared/utils'
import { ApprovalOutput, PendingApproval } from '@shared/approvalApi'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import Checkbox from '@popup/components/Checkbox'
import WebsiteIcon from '@popup/components/WebsiteIcon'

import TonWalletLogo from '@popup/img/ton-wallet-logo.svg'
import UserPicS from '@popup/img/user-avatar-placeholder-s.svg'

interface IApproveRequestPermissions {
    approval: PendingApproval<'requestPermissions'>
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    onSubmit: (data: ApprovalOutput<'requestPermissions'>) => void
    onReject: () => void
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
    const { permissions } = approval.requestData

    const shouldSelectAccount = permissions.includes('accountInteraction')

    const [localStep, setLocalStep] = useState<LocalStep>(
        shouldSelectAccount ? LocalStep.SELECT_ACCOUNT : LocalStep.CONFIRM
    )

    const [selectedAccount, setSelectedAccount] = useState<nt.AssetsList>()
    const [confirmChecked, setConfirmChecked] = useState(false)

    if (account == null) {
        return null
    }

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
                            <Checkbox
                                checked={selectedAccount != null}
                                setChecked={(checked) => {
                                    setSelectedAccount(checked ? account : undefined)
                                }}
                            />
                            <span className="connect-wallet-select-account__item-select">
                                Select all
                            </span>
                        </div>
                        <div
                            className="connect-wallet-select-account__item"
                            style={{ display: 'flex' }}
                        >
                            <Checkbox
                                checked={selectedAccount != null}
                                setChecked={(checked) => {
                                    setSelectedAccount(checked ? account : undefined)
                                }}
                            />

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
                        disabled={selectedAccount == null}
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
                        {shouldSelectAccount && (
                            <div style={{ width: '50%', marginRight: '12px' }}>
                                <Button
                                    text={'Back'}
                                    onClick={() => setLocalStep(LocalStep.SELECT_ACCOUNT)}
                                    white
                                />
                            </div>
                        )}
                        <Button
                            text={'Connect'}
                            disabled={!confirmChecked}
                            onClick={() => {
                                setLocalStep(LocalStep.CONNECTING)

                                const originPermissions: ApprovalOutput<'requestPermissions'> = {}
                                if (shouldSelectAccount) {
                                    originPermissions.accountInteraction = [
                                        {
                                            address: account.tonWallet.address,
                                            publicKey: account.tonWallet.publicKey,
                                            contractType: account.tonWallet.contractType,
                                        },
                                    ]
                                }

                                if (permissions.includes('tonClient')) {
                                    originPermissions.tonClient = true
                                }

                                onSubmit(originPermissions)
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
