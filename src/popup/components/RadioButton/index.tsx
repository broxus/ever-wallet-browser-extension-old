import React from 'react'

import './style.scss'

type RadioButtonValue = string | number | readonly string[] | undefined

interface IRadioButton<T> {
    id: string
    label: string
    onChange: (value: T) => void
    value: T
    isSelected: boolean
}

export class RadioButton<T extends RadioButtonValue> extends React.Component<IRadioButton<T>, {}> {
    render() {
        const { isSelected, id, label, onChange, value } = this.props

        return (
            <div className={`radio-button ${isSelected ? 'radio-button-selected' : ''}`}>
                <input
                    id={id}
                    onChange={(e) => {
                        onChange(e.target.value as any)
                    }}
                    value={value}
                    type="radio"
                    checked={isSelected}
                />
                <label htmlFor={id}>{label}</label>
            </div>
        )
    }
}

export default RadioButton
