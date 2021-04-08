import React from 'react'
import './radio-button.scss'

interface IRadioButton {
    id: string
    label: string
    changed: any
    value: string
    isSelected: boolean
}
const RadioButton: React.FC<IRadioButton> = (props) => {
    return (
        <div className="RadioButton">
            <input
                id={props.id}
                onChange={props.changed}
                value={props.value}
                type="radio"
                checked={props.isSelected}
            />
            <label htmlFor={props.id}>{props.label}</label>
        </div>
    )
}

export default RadioButton
