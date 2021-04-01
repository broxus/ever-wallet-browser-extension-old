import React, { Dispatch, SetStateAction } from 'react'
import UserPic from '../../img/user-avatar-placeholder.svg'
import Input from '../Input/Input'
import Select from 'react-select'
import './send.scss'
import { Button } from '../button'

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
export const selectStyles = {
    control: (styles: any, { isFocused }: any) => {
        return {
            ...styles,
            backgroundColor: '#ffffff',
            color: '#000000',
            border: !isFocused ? '1px solid #DDE1E2' : '1px solid #0088CC ',
            borderRadius: 0,
            fontSize: '16px',
            lineHeight: '20px',
            letterSpacing: '0.25px',
            minHeight: '48px',
        }
    },
    option: (styles: any, { isDisabled }: IOptionParams) => {
        const color = '#ffffff'
        return {
            ...styles,
            'backgroundColor': isDisabled ? 'red' : color,
            'color': '#000000',
            'fontSize': '16px',
            'lineHeight': '20px',
            'letterSpacing': '0.25px',
            'cursor': isDisabled ? 'not-allowed' : 'pointer',
            '&:hover': {
                color: '#0088cc',
            },
        }
    },
    indicatorsContainer: (styles: any) => ({ ...styles, cursor: 'pointer' }),
    placeholder: (styles: any) => ({ ...styles, color: '#000000' }),
    menu: (styles: any) => ({ ...styles, marginTop: 2, borderRadius: 0 }),
    valueContainer: (styles: any) => ({ ...styles, paddingBottom: '12px' }),
    singleValue: (styles: any) => ({ ...styles, color: '#0088cc' }),
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
