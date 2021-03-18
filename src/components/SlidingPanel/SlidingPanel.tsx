import React, { CSSProperties, Dispatch, SetStateAction } from 'react'
import CloseIcon from '../CloseIcon/CloseIcon'
import './sliding-panel.scss'

interface ISlidingPanel {
    isOpen: boolean
    setIsOpen: Dispatch<SetStateAction<boolean>>
    children?: JSX.Element[]
    height: string
}

const SlidingPanel: React.FC<ISlidingPanel> = ({ isOpen, setIsOpen, children, height }) => {
    return (
        <>
            {isOpen ? (
                <div className="sliding-panel__wrapper" style={{ height }}>
                    <div className="sliding-panel__content">
                        <CloseIcon handleClick={setIsOpen} />
                        {children}
                    </div>
                </div>
            ) : null}
        </>
    )
}

export default SlidingPanel
