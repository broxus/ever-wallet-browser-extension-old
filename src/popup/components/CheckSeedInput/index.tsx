import * as React from 'react'

import Input from '@popup/components/Input'

import './style.scss'

type Props = {
    number: number
    autoFocus?: boolean
    name: string
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const CheckSeedInput = React.forwardRef<HTMLInputElement, Props>(
    ({ number, autoFocus = false, name, onBlur, onChange }, ref) => {
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
)

export default CheckSeedInput
