import * as React from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'

import { useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { convertAddress, convertPublicKey } from '@shared/utils'

import Pattern from '@popup/img/ton-pattern.svg'

import './style.scss'

type Props = {
    accountName: string
    publicKey: string
    address: string
    balance: string
}

export function AccountCard({ accountName, publicKey, address, balance }: Props): JSX.Element {
    const manager = useAccountsManagement()

    const wholePart = balance.split('.')?.[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const decimals = balance.split('.')?.[1]

    return (
        <div className="account-card">
            <div className="account-card__info">
                <div className="account-card__info-details">
                    <div className="account-card__info-details-name">{accountName}</div>
                    <div className="account-card__info-details-public-key noselect">
                        Public key
                        <CopyToClipboard
                            text={publicKey}
                            onCopy={() => {
                                ReactTooltip.hide()
                            }}
                        >
                            <span
                                className="account-card__info-details-public-key-value"
                                data-tip="Click to copy"
                            >
                                {convertPublicKey(publicKey)}
                            </span>
                        </CopyToClipboard>
                        <ReactTooltip type="dark" effect="solid" place="bottom" />
                    </div>
                    <div className="account-card__info-details-public-key noselect">
                        Address
                        <CopyToClipboard
                            text={address}
                            onCopy={() => {
                                ReactTooltip.hide()
                            }}
                        >
                            <span
                                className="account-card__info-details-public-key-value"
                                data-tip="Click to copy"
                            >
                                {convertAddress(address) || 'Not created'}
                            </span>
                        </CopyToClipboard>
                        <ReactTooltip type="dark" effect="solid" place="bottom" />
                    </div>
                </div>

                {manager.selectedAccount?.tonWallet.address === address && (
                    <div className="account-card__info-balance">
                        {wholePart}
                        {`.${decimals || '00'} TON`}
                    </div>
                )}
            </div>
            <div className="account-card__pattern">
                <img src={Pattern} alt="" />
                {/*<div className="account-card__pattern-ellipsis">*/}
                {/*    <Ellipsis />*/}
                {/*</div>*/}
            </div>
        </div>
    )
}
