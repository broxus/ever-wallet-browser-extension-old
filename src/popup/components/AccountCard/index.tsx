import * as React from 'react'
import { useIntl } from 'react-intl'
import { NATIVE_CURRENCY } from '@shared/constants'

import { CopyText } from '@popup/components/CopyText'
import { convertAddress, convertPublicKey } from '@shared/utils'

import Pattern from '@popup/img/ton-pattern.svg'

import './style.scss'

type Props = {
    accountName: string
    address?: string
    balance: string
    publicKey: string
}

export function AccountCard({ accountName, address, balance, publicKey }: Props): JSX.Element {
    const intl = useIntl()
    const wholePart = balance.split('.')?.[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const decimals = balance.split('.')?.[1]

    return (
        <div className="account-card">
            <div className="account-card__info">
                <div className="account-card__info-details">
                    <div className="account-card__info-details-name">{accountName}</div>
                    <div className="account-card__info-details-public-key noselect">
                        {intl.formatMessage({ id: 'ACCOUNT_CARD_PUBLIC_KEY_LABEL' })}
                        <CopyText
                            className="account-card__info-details-public-key-value"
                            id={`copy-${publicKey}-${address}`}
                            place="top"
                            text={publicKey}
                        >
                            {convertPublicKey(publicKey)}
                        </CopyText>
                    </div>
                    <div className="account-card__info-details-public-key noselect">
                        {intl.formatMessage({ id: 'ACCOUNT_CARD_ADDRESS_LABEL' })}
                        {address !== undefined ? (
                            <CopyText
                                className="account-card__info-details-public-key-value"
                                id={`copy-${address}`}
                                place="top"
                                text={address}
                            >
                                {convertAddress(address)}
                            </CopyText>
                        ) : (
                            <span className="account-card__info-details-public-key-value">
                                {intl.formatMessage({ id: 'ACCOUNT_CARD_NO_ADDRESS_LABEL' })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="account-card__info-balance">
                    {wholePart}
                    {`.${decimals || '00'} ${NATIVE_CURRENCY}`}
                </div>
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
