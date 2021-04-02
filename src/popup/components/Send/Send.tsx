import React, { Dispatch, SetStateAction } from 'react'
import UserPic from '../../img/user-avatar-placeholder.svg'
import Input from '../Input/Input'
import Select from 'react-select'
import './send.scss'
import { Button } from '../button'
import { selectStyles } from '../../constants/selectStyle'

const options = [
    { value: '1', label: 'USDT' },
    { value: '60', label: 'TON' },
    { value: '60', label: 'BTC' },
    { value: '60', label: 'ETH' },
]

interface IOptionParams {
    data?: any
    isDisabled?: boolean
    isFocused?: boolean
    isSelected?: boolean
}

interface IAddNewToken {
    onReturn: Dispatch<SetStateAction<boolean>>
}

const Send: React.FC<IAddNewToken> = ({ onReturn }) => {
    // const [token, setToken] = useState<{ value: string; label: string } | null>([])
    return (
        <>
            <div className="send-screen__account_details">
                <UserPic /> <span className="send-screen__account_details-title">Account 1</span>
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
