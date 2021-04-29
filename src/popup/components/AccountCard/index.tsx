import React from 'react'
import { convertAddress } from '@shared/utils'

import ReactTooltip from 'react-tooltip'
import CopyToClipboard from 'react-copy-to-clipboard'

import Pattern from '@popup/img/ton-pattern.svg'
import Ellipsis from '@popup/img/ellipsis.svg'

import './style.scss'

interface IAccountCard {
    accountName: string
    publicKey: string
    address: string
    balance: string
}

const AccountCard: React.FC<IAccountCard> = ({ accountName, publicKey, address, balance }) => (
    <div className="account-card">
        <div className="account-card__info">
            <div className="account-card__info-details">
                <div className="account-card__info-details-name">{accountName}</div>
                <div className="account-card__info-details-public-key">
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
                            {convertAddress(publicKey)}
                        </span>
                    </CopyToClipboard>
                    <ReactTooltip type="dark" effect="solid" place="bottom" />
                </div>
                <div className="account-card__info-details-public-key">
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

            <div className="account-card__info-balance">
                {balance.split('.')?.[0]}
                <span className="account-card__info-balance-decimals">
                    {`.${balance.split('.')?.[1] || '00'} TON`}
                </span>
            </div>
        </div>
        <div className="account-card__pattern">
            <Pattern />
            <div className="account-card__pattern-ellipsis">
                <Ellipsis />
            </div>
        </div>
    </div>
)

export default AccountCard
