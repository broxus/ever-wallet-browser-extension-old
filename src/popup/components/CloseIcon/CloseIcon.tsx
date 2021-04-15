import React, { Dispatch, SetStateAction } from 'react'
import './close-icon.scss'

interface ICloseIcon {
    handleClick: Dispatch<SetStateAction<boolean>>
}
const CloseIcon: React.FC<ICloseIcon> = ({ handleClick }) => (
    <div className="close-container" onClick={() => handleClick(false)}>
        <div className="leftright"/>
        <div className="rightleft"/>
    </div>
)

export default CloseIcon
