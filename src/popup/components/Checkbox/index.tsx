import React from 'react'
import classNames from 'classnames'

import './style.scss'

type Props = {
    id?: string
    checked: boolean
    disabled?: boolean
    onChange: (value: boolean) => void
}

export function Checkbox({
    id,
    checked,
    disabled,
    onChange
}: Props): JSX.Element {
    const onToggle = () => {
        onChange?.(!checked)
    }

    return (
        <label
            htmlFor={id}
            className={classNames('checkbox-container', {
                'checkbox-container_disabled': disabled,
            })}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onToggle}
                disabled={disabled}
            />
            <span className="checkbox-checkmark" />
        </label>
    )
}
