import React, { useState } from 'react'
import './send.scss'
import UserPic from '../../img/user-avatar-placeholder.svg'
import Input from '../Input/Input'
import Select from 'react-select'

const options = [
    { value: '1', label: 'minutes' },
    { value: '60', label: 'hours' },
]

const selectStyles = {
    control: (styles) => ({
        ...styles,
        backgroundColor: '#ffffff',
        color: '#000000',
        border: '1px solid #DDE1E2',
        borderRadius: 0,
        fontSize: '16px',
        lineHeight: '20px',
        letterSpacing: '0.25px',
        minHeight: '48px',
    }),
    option: (styles, { data, isDisabled, isFocused, isSelected }) => {
        const color = '#ffffff'
        return {
            ...styles,
            'backgroundColor': isDisabled ? 'red' : color,
            'color': '#000000',
            'cursor': isDisabled ? 'not-allowed' : 'pointer',
            '&:hover': {
                color: '#0088cc',
            },
        }
    },
    indicatorsContainer: (styles) => ({ ...styles, cursor: 'pointer' }),
    placeholder: (styles) => ({ ...styles, color: '#000000' }),
    menu: (styles) => ({ ...styles, marginTop: 2, borderRadius: 0 }),
    valueContainer: (styles) => ({ ...styles, paddingBottom: '12px' }),
    singleValue: (styles) => ({ ...styles, color: '#fff' }),
}

const Send = () => {
    const [token, setToken] = useState<{ value: string; label: string } | null>([])
    return (
        <>
            <UserPic /> <span>Account 1</span>
            <h2>Enter receiver address</h2>
            <Input label={'Amount...'} />
            <Select
                options={options}
                placeholder={'USDT'}
                styles={selectStyles}
                w
                onChange={(token) => {
                    setToken(token)
                }}
            />
            <span>Your balance: 1,100.00 USDT</span>
            <Input label={'Receiver address...'} />
            <Input label={'Comment...'} />
        </>
    )
}

export default Send
