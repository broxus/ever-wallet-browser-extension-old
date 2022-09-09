import * as React from 'react'
import { useIntl } from 'react-intl'
import classNames from 'classnames'

import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'
import { ApprovalOutput, PendingApproval } from '@shared/backgroundApi'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { convertTons } from '@shared/utils'

import Button from '@popup/components/Button'
import { Checkbox } from '@popup/components/Checkbox'
import WebsiteIcon from '@popup/components/WebsiteIcon'
import UserAvatar from '@popup/components/UserAvatar'

import TonWalletLogo from '@popup/img/ton-wallet-logo.svg'

import './style.scss'
import { TOKENS_MANIFEST_REPO } from '@popup/utils'

type Props = {
    approval: PendingApproval<'requestPermissions'>
    accountContractStates: { [address: string]: nt.ContractState }
    accountEntries: { [address: string]: nt.AssetsList }
    onSubmit: (data: ApprovalOutput<'requestPermissions'>) => void
    onReject: () => void
}

enum LocalStep {
    SELECT_ACCOUNT,
    CONFIRM,
    CONNECTING,
}

export function ApproveRequestPermissions({
    approval,
    accountContractStates,
    accountEntries,
    onSubmit,
}: Props): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()

    const { origin } = approval
    const { permissions } = approval.requestData

    const shouldSelectAccount = permissions.includes('accountInteraction')

    const [localStep, setLocalStep] = React.useState<LocalStep>(
        shouldSelectAccount ? LocalStep.SELECT_ACCOUNT : LocalStep.CONFIRM
    )

    const [selectedAccount, setSelectedAccount] = React.useState<nt.AssetsList | undefined>(
        accountability.selectedAccount
    )
    const [confirmChecked, setConfirmChecked] = React.useState(true)

    return (
        <div
            className={classNames('connect-wallet', {
                'connect-wallet_connecting': localStep === LocalStep.CONNECTING,
            })}
        >
            {[LocalStep.SELECT_ACCOUNT, LocalStep.CONFIRM].includes(localStep) && (
                <header key="header" className="connect-wallet__header">
                    <div className="connect-wallet__origin-source">
                        <WebsiteIcon origin={origin} />
                        <div className="connect-wallet__origin-source-value">{origin}</div>
                    </div>
                    {localStep === LocalStep.SELECT_ACCOUNT && (
                        <h2
                            key="select-account-heading"
                            className="connect-wallet__header-title noselect"
                        >
                            {intl.formatMessage({ id: 'APPROVE_REQUEST_PERMISSIONS_HEADER' })}
                        </h2>
                    )}
                    {localStep === LocalStep.CONFIRM && (
                        <>
                            <h2
                                key="confirm-heading"
                                className="connect-wallet__header-title noselect"
                            >
                                {intl.formatMessage(
                                    { id: 'APPROVE_REQUEST_PERMISSIONS_CONNECTED_TO' },
                                    { name: selectedAccount?.name || '' }
                                )}
                            </h2>
                            <div className="connect-wallet__account-balance">
                                {`${convertTons(
                                    (selectedAccount &&
                                        accountContractStates[selectedAccount.tonWallet.address]
                                            ?.balance) ||
                                        '0'
                                )} ${NATIVE_CURRENCY}`}
                            </div>
                        </>
                    )}
                </header>
            )}
            {localStep === LocalStep.SELECT_ACCOUNT && (
                <div className="connect-wallet__wrapper">
                    <div className="connect-wallet__accounts-list">
                        {window.ObjectExt.values(accountEntries).map((account) => (
                            <div
                                key={account.tonWallet.address}
                                className="connect-wallet__accounts-list-item"
                            >
                                <Checkbox
                                    checked={
                                        selectedAccount?.tonWallet.address ==
                                        account.tonWallet.address
                                    }
                                    id={`account-${account.tonWallet.address}`}
                                    onChange={(checked) => {
                                        setSelectedAccount(checked ? account : undefined)
                                    }}
                                />
                                <UserAvatar address={account.tonWallet.address} small />
                                <label
                                    className="connect-wallet__account-scope"
                                    htmlFor={`account-${account.tonWallet.address}`}
                                >
                                    <div className="connect-wallet__account-name">
                                        {account.name}
                                    </div>
                                    <div className="connect-wallet__account-balance">
                                        {`${convertTons(
                                            accountContractStates[account.tonWallet.address]
                                                ?.balance || '0'
                                        )} ${NATIVE_CURRENCY}`}
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>

                    <footer className="connect-wallet__footer">
                        <Button
                            type="submit"
                            text={intl.formatMessage({ id: 'NEXT_BTN_TEXT' })}
                            disabled={selectedAccount == null}
                            onClick={() => setLocalStep(LocalStep.CONFIRM)}
                        />
                    </footer>
                </div>
            )}

            {localStep === LocalStep.CONFIRM && (
                <div className="connect-wallet__wrapper">
                    <div className="connect-wallet__permissions">
                        <h3 className="connect-wallet__permissions-heading noselect">
                            {intl.formatMessage({
                                id: 'APPROVE_REQUEST_PERMISSIONS_PERMISSIONS_SUBHEADING',
                            })}
                        </h3>
                        <div className="connect-wallet__permissions-list">
                            <div className="connect-wallet__permissions-list-item">
                                <Checkbox checked={confirmChecked} onChange={setConfirmChecked} />
                                <div className="connect-wallet__permissions-names-list">
                                    {JSON.stringify(permissions, undefined, 4)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="connect-wallet__footer">
                        {shouldSelectAccount && (
                            <div className="connect-wallet__footer-button-back">
                                <Button
                                    text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                                    white
                                    onClick={() => setLocalStep(LocalStep.SELECT_ACCOUNT)}
                                />
                            </div>
                        )}
                        <Button
                            text={intl.formatMessage({ id: 'CONNECT_BTN_TEXT' })}
                            disabled={!confirmChecked || (shouldSelectAccount && !selectedAccount)}
                            onClick={() => {
                                setLocalStep(LocalStep.CONNECTING)

                                const originPermissions: ApprovalOutput<'requestPermissions'> = {}
                                if (shouldSelectAccount && selectedAccount) {
                                    originPermissions.accountInteraction = {
                                        address: selectedAccount.tonWallet.address,
                                        publicKey: selectedAccount.tonWallet.publicKey,
                                        contractType: selectedAccount.tonWallet.contractType as any,
                                    }
                                }

                                if (permissions.includes('basic')) {
                                    originPermissions.basic = true
                                }

                                onSubmit(originPermissions)
                            }}
                        />
                    </footer>
                </div>
            )}

            {localStep === LocalStep.CONNECTING && (
                <div className="connect-wallet__connecting">
                    <h2 className="connect-wallet__connecting-heading">
                        {intl.formatMessage({ id: 'CONNECTING_HINT' })}
                    </h2>
                    <div className="connect-wallet__connecting-process">
                        <WebsiteIcon origin={origin} />
                        <p className="connecting-process">
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
