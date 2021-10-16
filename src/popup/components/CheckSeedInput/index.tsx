import * as React from 'react'
import { CustomElement, FieldElement, FieldValues, Ref } from 'react-hook-form'

import Input from '@popup/components/Input'

import './style.scss'

type Props = {
    number: number
    autoFocus?: boolean
    name: string
    ref?: any
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function CheckSeedInput({
    number,
    autoFocus = false,
    name,
    ref,
    onBlur,
    onChange,
}: Props): JSX.Element {
    return (
        <div className="check-seed__input">
            <span className="check-seed__input-number">{`${number}. `}</span>
            <Input
                label="Enter the word"
                className="check-seed__input-placeholder"
                autoFocus={autoFocus}
                type="text"
                name={name}
                ref={ref}
                onBlur={onBlur}
                onChange={onChange}
            />
        </div>
    )
}
