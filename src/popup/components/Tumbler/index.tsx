import React from 'react'

import './style.scss'

const Tumbler = ({ checked = false, onChange = () => {} }) => (
    <>
        <input type="checkbox" id="toggle" checked={checked} onChange={onChange} />
        <label htmlFor="toggle" className="toggle">
            <div className="slider"> </div>
        </label>
    </>
)

export default Tumbler
