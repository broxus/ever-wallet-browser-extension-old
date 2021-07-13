import * as React from 'react'
import { CustomElement, FieldElement, FieldValues, Ref } from 'react-hook-form'

import Input from '@popup/components/Input'

import './style.scss'

type Props = {
    number: number
    autoFocus?: boolean
    name: string
    register:
        | (HTMLSelectElement & HTMLTextAreaElement & CustomElement<FieldValues> & HTMLInputElement)
        | (FieldElement & Ref)
        | null
}

export function CheckSeedInput({
    number,
    autoFocus = false,
    name,
    register,
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
                register={register}
            />
        </div>
    )
}
