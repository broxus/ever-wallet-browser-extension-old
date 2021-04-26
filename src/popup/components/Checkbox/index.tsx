import React from 'react'

import './style.scss'

interface ICheckbox {
    checked: boolean
    setChecked: (arg0: boolean) => void
}

const Checkbox: React.FC<ICheckbox> = ({ checked, setChecked }) => (
    <label className="container">
        <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} />
        <span className="checkmark" />
    </label>
)

export default Checkbox
