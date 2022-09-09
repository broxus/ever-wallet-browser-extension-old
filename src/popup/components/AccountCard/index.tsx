import * as React from 'react'
import { useIntl } from 'react-intl'
import { NATIVE_CURRENCY } from '@shared/constants'

import { hideModalOnClick } from '@popup/common'
import { useRpc } from '@popup/providers/RpcProvider'
import { convertAddress, convertPublicKey } from '@shared/utils'
import { useAccountability } from '@popup/providers/AccountabilityProvider'

import { CopyText } from '@popup/components/CopyText'

import Pattern from '@popup/img/ton-pattern.svg'
import Elipsis from '@popup/img/ellipsis.svg'

import './style.scss'

type Props = {
    accountName: string
    address?: string
    balance: string
    publicKey: string
}

export function AccountCard({ accountName, address, balance, publicKey }: Props): JSX.Element {
    const intl = useIntl()
    const rpc = useRpc()
    const accountability = useAccountability()
    const wholePart = balance.split('.')?.[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const decimals = balance.split('.')?.[1]

    const [contextMenuOpen, setContextMenuOpen] = React.useState(false)
    const [inProcess, setInProcess] = React.useState(false)

    const iconRef = React.useRef(null)
    const wrapperRef = React.useRef(null)

    hideModalOnClick(wrapperRef, iconRef, () => setContextMenuOpen(false))

    const canRemove = accountability.accounts.length > 1

    const onRemove = () => {
        if (inProcess || address == null || !canRemove) {
            return
        }
        setInProcess(true)
        rpc.removeAccount(address)
            .catch(console.error)
            .finally(() => setInProcess(false))
    }

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
                {address != null && canRemove && (
                    <div className="account-card__pattern-ellipsis">
                        <img
                            src={Elipsis}
                            alt=""
                            onClick={() => setContextMenuOpen(!contextMenuOpen)}
                            ref={iconRef}
                        />
                    </div>
                )}
            </div>

            {contextMenuOpen && (
                <div className="account-card__context-menu noselect">
                    <div className="account-card__context-menu__content" ref={wrapperRef}>
                        <div className="account-card__context-menu__item remove" onClick={onRemove}>
                            Remove
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
