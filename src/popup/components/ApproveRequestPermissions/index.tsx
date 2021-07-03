import React, { useState } from 'react'
import { convertTons } from '@shared/utils'
import { ApprovalOutput, PendingApproval } from '@shared/backgroundApi'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import Checkbox from '@popup/components/Checkbox'
import WebsiteIcon from '@popup/components/WebsiteIcon'
import UserAvatar from '@popup/components/UserAvatar'

import TonWalletLogo from '@popup/img/ton-wallet-logo.svg'

interface IApproveRequestPermissions {
    approval: PendingApproval<'requestPermissions'>
    accountEntries: { [publicKey: string]: nt.AssetsList[] }
    accountContractStates: { [address: string]: nt.ContractState }
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
    accountEntries,
    accountContractStates,
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

    return (
        <div className="connect-wallet-select-account">
            {localStep === LocalStep.SELECT_ACCOUNT && (
                <>
                    <div>
                        <div className="connect-wallet__spend-top-panel__site">
                            <WebsiteIcon origin={origin} />
                            <div className="connect-wallet-select-account-source">{origin}</div>
                        </div>
                        <h2 className="connect-wallet-select-account__title noselect">
                            Select account to connect with Crystal wallet
                        </h2>

                        {window.ObjectExt.values(accountEntries).map((items) =>
                            items.map((item) => (
                                <div
                                    className="connect-wallet-select-account__item"
                                    style={{ display: 'flex' }}
                                >
                                    <Checkbox
                                        checked={
                                            selectedAccount?.tonWallet.address ==
                                            item.tonWallet.address
                                        }
                                        setChecked={(checked) => {
                                            setSelectedAccount(checked ? item : undefined)
                                        }}
                                    />
                                    <UserAvatar address={item.tonWallet.address} small />
                                    <div style={{ padding: '0 12px' }}>
                                        <div className="account-settings-section-account">
                                            {item.name}
                                        </div>
                                        <div className="connect-wallet-select-account__item-value">
                                            {`${convertTons(
                                                accountContractStates[item.tonWallet.address]
                                                    ?.balance || '0'
                                            )} TON`}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
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
                        <h2 className="noselect">{`Connected to ${selectedAccount?.name}`}</h2>
                        <div
                            className="connect-wallet-select-account__item-value"
                            style={{ marginBottom: '32px' }}
                        >
                            {`${convertTons(
                                (selectedAccount &&
                                    accountContractStates[selectedAccount.tonWallet.address]
                                        ?.balance) ||
                                    '0'
                            )} TON`}
                        </div>
                        <h3
                            style={{ fontWeight: 'bold', marginBottom: '16px' }}
                            className="noselect"
                        >
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
                            disabled={!confirmChecked || (shouldSelectAccount && !selectedAccount)}
                            onClick={() => {
                                setLocalStep(LocalStep.CONNECTING)

                                const originPermissions: ApprovalOutput<'requestPermissions'> = {}
                                if (shouldSelectAccount && selectedAccount) {
                                    originPermissions.accountInteraction = {
                                        address: selectedAccount.tonWallet.address,
                                        publicKey: selectedAccount.tonWallet.publicKey,
                                        contractType: selectedAccount.tonWallet.contractType,
                                    }
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

                        <img src={TonWalletLogo} alt="" />
                    </div>
                </div>
            )}
        </div>
    )
}

export default ApproveRequestPermissions
