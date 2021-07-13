import React from 'react'

import './style.scss'

type ITumbler = {
    checked: boolean
    onChange: (checked: boolean) => void
    id: string
}

const Tumbler: React.FC<ITumbler> = ({ checked, onChange, id }) => (
    <>
        <input
            type="checkbox"
            id={`${id}-toggle`}
            checked={checked}
            style={{ display: 'none' }}
            onChange={() => {
                onChange(!checked)
            }}
        />
        <label htmlFor={`${id}-toggle`} className="toggle">
            <div className="slider" />
        </label>
    </>
)

export default Tumbler
