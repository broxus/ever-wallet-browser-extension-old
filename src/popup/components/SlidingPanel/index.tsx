import React, { Dispatch, SetStateAction } from 'react'
import cn from 'classnames'

import CloseIcon from '@components/CloseIcon'

import './style.scss'

interface ISlidingPanel {
    isOpen: boolean
    setIsOpen: Dispatch<SetStateAction<boolean>>
    children?: JSX.Element
}

const SlidingPanel: React.FC<ISlidingPanel> = ({ isOpen, setIsOpen, children }) => {
    return (
        <>
            <div className={cn('sliding-panel__wrapper', { _active: isOpen })}>
                <div className={cn('sliding-panel__content')}>
                    <div className="sliding-panel__content-header">
                        <CloseIcon handleClick={setIsOpen} />
                    </div>
                    {children}
                </div>
            </div>
        </>
    )
}

export default SlidingPanel
