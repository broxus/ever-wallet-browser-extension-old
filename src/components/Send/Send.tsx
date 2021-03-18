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
        backgroundColor: '#3c6cce',
        color: '#fff',
        border: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: 0,
    }),
    option: (styles, { data, isDisabled, isFocused, isSelected }) => {
        const color = '#3c6cce'
        return {
            ...styles,
            'backgroundColor': isDisabled ? 'red' : color,
            'color': '#FFF',
            'cursor': isDisabled ? 'not-allowed' : 'pointer',
            '&:hover': {
                backgroundColor: '#97B9FF',
            },
        }
    },
    indicatorsContainer: (styles) => ({ ...styles, cursor: 'pointer' }),
    placeholder: (styles) => ({ ...styles, color: 'rgba(255, 255, 255, 0.7)' }),
    menuList: (styles) => ({ ...styles, padding: 0 }),
    valueContainer: (styles) => ({ ...styles, paddingBottom: '12px' }),
    singleValue: (styles) => ({ ...styles, color: '#fff' }),
}

const Send = () => {
    const [token, setToken] = useState([])
    return (
        <>
            <UserPic /> <span>Account 1</span>
            <h2>Enter receiver address</h2>
            <Input label={'Amount...'} />
            <Select
                // className={styles.dropdown}
                options={options}
                placeholder={'minutes / hours'}
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
