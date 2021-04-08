import React from 'react'
import Input from '../Input/Input'
import { CustomElement, FieldElement, FieldValues, Ref } from 'react-hook-form'
import './check-seed-input.scss'

interface ICheckSeedInput {
    number: number
    autoFocus?: boolean
    name: string
    register:
        | (HTMLSelectElement & HTMLTextAreaElement & CustomElement<FieldValues> & HTMLInputElement)
        | (FieldElement<FieldValues> & Ref)
        | null
}

const CheckSeedInput: React.FC<ICheckSeedInput> = ({
    number,
    autoFocus = false,
    name,
    register,
}) => (
    <div className="check-seed__input">
        <span className="check-seed__input-number">{`${number}. `}</span>
        <Input
            label={'Enter the word'}
            className="check-seed__input-placeholder"
            autoFocus={autoFocus}
            type={'text'}
            name={name}
            register={register}
        />
    </div>
)

export default CheckSeedInput
