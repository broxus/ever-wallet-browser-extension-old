import React, { Dispatch, SetStateAction } from 'react'
import { selectStyles } from '@popup/constants/selectStyle'
import * as nt from '@nekoton'

import Select from 'react-select'
import Input from '@popup/components/Input'
import Button from '@popup/components/Button'
import UserAvatar from '@popup/components/UserAvatar'

import './send.scss'

const options = [
    { value: '1', label: 'USDT' },
    { value: '60', label: 'TON' },
    { value: '60', label: 'BTC' },
    { value: '60', label: 'ETH' },
]

interface IAddNewToken {
    account: nt.AssetsList
    onReturn: () => void
}

const Send: React.FC<IAddNewToken> = ({ account, onReturn }) => {
    // const [token, setToken] = useState<{ value: string; label: string } | null>([])
    return (
        <>
            <div className="send-screen__account_details">
                <UserAvatar address={account.tonWallet.address} />{' '}
                <span className="send-screen__account_details-title">Account 1</span>
            </div>

            <h2 className="send-screen__form-title">Enter receiver address</h2>
            <Select
                className="send-screen__form-token-dropdown"
                options={options}
                placeholder={'USDT'}
                styles={selectStyles}
                w
                // onChange={(token) => {
                //     setToken(token)
                // }}
            />
            <Input label={'Amount...'} />
            <div className="send-screen__form-balance">Your balance: 1,100.00 USDT</div>
            <Input label={'Receiver address...'} />
            <Input className="send-screen__form-comment" label={'Comment...'} />
            <div style={{ display: 'flex' }}>
                <div style={{ width: '50%', marginRight: '12px' }}>
                    <Button text={'Back'} onClick={onReturn} white />
                </div>
                <Button text={'Send'} />
            </div>
        </>
    )
}

export default Send
