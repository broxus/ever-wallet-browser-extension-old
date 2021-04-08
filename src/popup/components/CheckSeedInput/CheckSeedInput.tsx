import React from 'react'
import Input from '../Input/Input'
import './check-seed-input.scss'

interface ICheckSeedInput {
    number: number
    autoFocus?: boolean
}

const CheckSeedInput: React.FC<ICheckSeedInput> = ({ number, autoFocus = false }) => (
    <div className="check-seed__input">
        <span className="check-seed__input-number">{`${number}. `}</span>
        <Input
            label={'Enter the word'}
            className="check-seed__input-placeholder"
            autoFocus={autoFocus}
            type={'text'}
        />
    </div>
)

export default CheckSeedInput
