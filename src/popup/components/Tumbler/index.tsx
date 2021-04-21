import React from 'react'

import './style.scss'

type ITumbler = {
    checked: boolean
    onChange: (checked: boolean) => void
}

const Tumbler: React.FC<ITumbler> = ({ checked, onChange }) => (
    <>
        <input
            type="checkbox"
            id="toggle"
            checked={checked}
            onChange={() => {
                onChange(!checked)
            }}
        />
        <label htmlFor="toggle" className="toggle">
            <div className="slider" />
        </label>
    </>
)

export default Tumbler
