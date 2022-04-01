import * as React from 'react'
import { useIntl } from 'react-intl'

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
        const intl = useIntl()
        return (
            <div className="check-seed__input">
                <span className="check-seed__input-number">{`${number}. `}</span>
                <Input
                    label={intl.formatMessage({ id: 'ENTER_THE_WORD_FIELD_PLACEHOLDER' })}
                    className="check-seed__input-placeholder"
                    autoFocus={autoFocus}
                    autocomplete="off"
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
