import React from 'react'
import './input.scss'

interface ISimpleInput {
    label?: string
    autoFocus?: boolean
    type?:
        | 'text'
        | 'none'
        | 'tel'
        | 'url'
        | 'email'
        | 'numeric'
        | 'decimal'
        | 'search'
        | 'password'
        | undefined
    register?: any
    name?: string
    autocomplete?: string
    pattern?: string
    inputMode?:
        | 'text'
        | 'none'
        | 'tel'
        | 'url'
        | 'email'
        | 'numeric'
        | 'decimal'
        | 'search'
        | undefined
    min?: string
    value?: string
    readOnly?: boolean
    id?: string
}

const Input: React.FC<ISimpleInput> = ({
    label,
    autoFocus = false,
    type = 'number',
    register,
    name = '',
    autocomplete = 'off',
    pattern = undefined,
    inputMode = undefined,
    min = undefined,
    value = undefined,
    readOnly = false,
    id,
}) => {
    return (
        <input
            className="simple-input"
            readOnly={readOnly}
            name={name}
            id={id}
            ref={register}
            autoFocus={autoFocus}
            placeholder={label}
            type={type}
            autoComplete={autocomplete}
            pattern={pattern}
            inputMode={inputMode}
            min={min}
            step={0.000000000000000001}
            value={value}
        />
    )
}
export default Input
