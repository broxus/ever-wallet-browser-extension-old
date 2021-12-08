import * as React from 'react'
import classNames from 'classnames'

import { NATIVE_CURRENCY } from '@shared/constants'
import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import { Checkbox } from '@popup/components/Checkbox'
import WebsiteIcon from '@popup/components/WebsiteIcon'
import UserAvatar from '@popup/components/UserAvatar'
import { ApprovalOutput, PendingApproval } from '@shared/backgroundApi'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { convertTons } from '@shared/utils'

import TonWalletLogo from '@popup/img/ton-wallet-logo.svg'

import './style.scss'

type Props = {
    approval: PendingApproval<'changeAccount'>
    accountContractStates: { [address: string]: nt.ContractState }
    accountEntries: { [address: string]: nt.AssetsList }
    onSubmit: (data: ApprovalOutput<'changeAccount'>) => void
    onReject: () => void
}

enum LocalStep {
    SELECT_ACCOUNT,
    CONNECTING,
}

export function ApproveChangeAccount({
    approval,
    accountContractStates,
    accountEntries,
    onSubmit,
}: Props): JSX.Element {
    const accountability = useAccountability()

    const { origin } = approval

    const [localStep, setLocalStep] = React.useState<LocalStep>(LocalStep.SELECT_ACCOUNT)

    const [selectedAccount, setSelectedAccount] = React.useState<nt.AssetsList | undefined>(
        accountability.selectedAccount
    )

    return (
        <div
            className={classNames('change-account', {
                'change-account_connecting': localStep === LocalStep.CONNECTING,
            })}
        >
            {localStep === LocalStep.SELECT_ACCOUNT && (
                <>
                    <header key="header" className="change-account__header">
                        <div className="change-account__origin-source">
                            <WebsiteIcon origin={origin} />
                            <div className="change-account__origin-source-value">{origin}</div>
                        </div>
                        <h2
                            key="select-account-heading"
                            className="change-account__header-title noselect"
                        >
                            Select account to connect with EVER Wallet
                        </h2>
                    </header>
                    <div className="change-account__wrapper">
                        <div className="change-account__accounts-list">
                            {window.ObjectExt.values(accountEntries).map((account) => (
                                <div
                                    key={account.tonWallet.address}
                                    className="change-account__accounts-list-item"
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
                                        className="change-account__account-scope"
                                        htmlFor={`account-${account.tonWallet.address}`}
                                    >
                                        <div className="change-account__account-name">
                                            {account.name}
                                        </div>
                                        <div className="change-account__account-balance">
                                            {`${convertTons(
                                                accountContractStates[account.tonWallet.address]
                                                    ?.balance || '0'
                                            )} ${NATIVE_CURRENCY}`}
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>

                        <footer className="change-account__footer">
                            <Button
                                type="submit"
                                text="Next"
                                disabled={selectedAccount == null}
                                onClick={() => {
                                    setLocalStep(LocalStep.CONNECTING)
                                    if (selectedAccount) {
                                        onSubmit({
                                            address: selectedAccount.tonWallet.address,
                                            publicKey: selectedAccount.tonWallet.publicKey,
                                            contractType: selectedAccount.tonWallet.contractType,
                                        })
                                    }
                                }}
                            />
                        </footer>
                    </div>
                </>
            )}

            {localStep === LocalStep.CONNECTING && (
                <div className="change-account__connecting">
                    <h2 className="change-account__connecting-heading">Connecting...</h2>
                    <div className="change-account__connecting-process">
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
