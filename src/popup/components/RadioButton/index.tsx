import React from 'react'
import classNames from 'classnames'

import './style.scss'

type RadioButtonValue = string | number | readonly string[] | undefined

interface IRadioButton<T> {
    id: string
    label: string
    description?: string
    onChange: (value: T) => void
    value: T
    disabled?: boolean
    checked: boolean
}

export class RadioButton<T extends RadioButtonValue> extends React.Component<IRadioButton<T>, {}> {
    render() {
        const { checked, disabled, id, label, onChange, value, description } = this.props

        return (
            <div
                className={classNames('radio-button', {
                    'radio-button-checked': checked,
                    'radio-button-disabled': disabled,
                    'with-description': description != null,
                })}
            >
                <input
                    id={id}
                    onChange={(e) => {
                        if (!disabled) {
                            onChange(e.target.value as any)
                        }
                    }}
                    value={value}
                    type="radio"
                    checked={checked}
                />
                <label htmlFor={id}>
                    {label}
                    {description && <small>{description}</small>}
                </label>
            </div>
        )
    }
}

export default RadioButton
