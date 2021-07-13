import React from 'react'

import './style.scss'

type Props = {
    checked: boolean
    id?: string
    onChange: (value: boolean) => void
}

export function Checkbox({ checked, id, onChange }: Props): JSX.Element {
    const onToggle = () => {
        onChange?.(!checked)
    }

    return (
        <label className="checkbox-container" htmlFor={id}>
            <input id={id} type="checkbox" checked={checked} onChange={onToggle} />
            <span className="checkbox-checkmark" />
        </label>
    )
}
