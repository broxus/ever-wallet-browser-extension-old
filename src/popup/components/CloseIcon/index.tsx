import React from 'react'

import './style.scss'

interface ICloseIcon {
    onClick: () => void
}

const CloseIcon: React.FC<ICloseIcon> = ({ onClick }) => (
    <div className="close-container" onClick={onClick}>
        <div className="leftright" />
        <div className="rightleft" />
    </div>
)

export default CloseIcon
