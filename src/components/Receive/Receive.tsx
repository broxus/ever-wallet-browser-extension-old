import React, { Dispatch, SetStateAction } from 'react'
import UserPic from '../../img/user-avatar-placeholder.svg'
import './receive.scss'
import { Button } from '../button'
import QRCode from 'react-qr-code'

interface IReceive {
    onReturn?: Dispatch<SetStateAction<boolean>>
}

const Receive: React.FC<IReceive> = () => (
    <>
        <div className="receive-screen__account_details">
            <UserPic /> <span className="receive-screen__account_details-title">Account 1</span>
        </div>

        <h2 className="receive-screen__form-title">Your address to receive TON funds</h2>
        <div className="receive-screen__qr-code">
            <div className="receive-screen__qr-code-code">
                {/*TODO убрать адрес*/}
                <QRCode
                    value={`ton://chat/${'0:a334e82b23e7c736db4a63fbc9cf07f062c2a3a6baba8612c1a376a331db5499'}`}
                    size={80}
                />
            </div>
            <div className="receive-screen__qr-code-instruction">
                Get the address with your smartphone camera by scanning this QR code.
            </div>
        </div>

        <Button text={'Copy address'} />
    </>
)

export default Receive
