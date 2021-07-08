import React from 'react'

import QRCode from 'react-qr-code'
import { CopyButton } from '@popup/components/CopyButton'
import Button from '@popup/components/Button'
import UserAvatar from '@popup/components/UserAvatar'

import './style.scss'

interface IReceive {
    accountName?: string
    address: string
    currencyName?: string
}

const Receive: React.FC<IReceive> = ({ accountName, address, currencyName }) => (
    <>
        <div className="receive-screen__account_details">
            <UserAvatar address={address} />
            <span className="receive-screen__account_details-title">{accountName || ''}</span>
        </div>

        <h3 className="receive-screen__form-title noselect">
            Your address to receive {currencyName || 'TON'}
        </h3>
        <div className="receive-screen__qr-code">
            <div className="receive-screen__qr-code-code">
                <QRCode value={`ton://chat/${address}`} size={80} />
            </div>
            <div className="receive-screen__qr-code-address">{address}</div>
        </div>

        <CopyButton text={address}>
            <Button text={'Copy address'} />
        </CopyButton>
    </>
)

export default Receive
