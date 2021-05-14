import React from 'react'
import { convertAddress, convertPublicKey } from '@shared/utils'

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

const AccountCard: React.FC<IAccountCard> = ({ accountName, publicKey, address, balance }) => {
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

                <div
                    className={`account-card__info-balance ${
                        wholePart?.length + decimals?.length > 10
                            ? 'account-card__info-balance--resized'
                            : ''
                    }`}
                >
                    {wholePart}
                    <span className="account-card__info-balance-decimals">
                        {`.${decimals || '00'} TON`}
                    </span>
                </div>
            </div>
            <div className="account-card__pattern">
                <Pattern />
                {/*<div className="account-card__pattern-ellipsis">*/}
                {/*    <Ellipsis />*/}
                {/*</div>*/}
            </div>
        </div>
    )
}
export default AccountCard
