import React from 'react'
import cn from 'classnames'

import CloseIcon from '@popup/components/CloseIcon'

import './style.scss'

interface ISlidingPanel {
    isOpen: boolean
    onClose: () => void
    children?: JSX.Element | JSX.Element[]
}

const SlidingPanel: React.FC<ISlidingPanel> = ({ isOpen, onClose, children }) => {
    return (
        <>
            {isOpen && <div className="sliding-panel__fade-in" />}
            <div className={cn('sliding-panel__wrapper', { _active: isOpen })}>
                <div className="sliding-panel__wrapper__background" onClick={onClose} />
                <div className={cn('sliding-panel__content')}>
                    <div className="sliding-panel__content-header">
                        <CloseIcon onClick={onClose} />
                    </div>
                    {children}
                </div>
            </div>
        </>
    )
}

export default SlidingPanel
