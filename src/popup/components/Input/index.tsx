import React from 'react'

import './style.scss'

interface ISimpleInput {
    className?: string
    label?: string
    autoFocus?: boolean
    disabled?: boolean
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
    max?: string
    value?: string
    readOnly?: boolean
    id?: string
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

const Input = React.forwardRef<HTMLInputElement, ISimpleInput>((props, ref) => (
    <input
        className={`simple-input ${props.className || ''}`}
        readOnly={props.readOnly}
        spellCheck={false}
        name={props.name}
        id={props.id}
        ref={ref}
        autoFocus={props.autoFocus}
        disabled={props.disabled}
        placeholder={props.label}
        type={props.type}
        autoComplete={props.autocomplete}
        pattern={props.pattern}
        inputMode={props.inputMode}
        min={props.min}
        max={props.max}
        step={0.000000000000000001}
        value={props.value}
        onBlur={props.onBlur}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
    />
))

export default Input
