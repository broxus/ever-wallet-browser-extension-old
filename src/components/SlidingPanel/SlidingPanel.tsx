import React, { Dispatch, SetStateAction } from 'react'
import './sliding-panel.scss'
import cn from 'classnames'
import CloseIcon from '../CloseIcon/CloseIcon'

interface ISlidingPanel {
    isOpen: boolean
    setIsOpen: Dispatch<SetStateAction<boolean>>
    children?: JSX.Element[]
}

const SlidingPanel: React.FC<ISlidingPanel> = ({ isOpen, setIsOpen, children }) => (
    <div
        className={cn('cd-panel js-cd-panel-main', {
            _isVisible: isOpen,
        })}
    >
        <header className="cd-panel__header">
            <h1>Title Goes Here</h1>

            <CloseIcon handleClick={setIsOpen} />
        </header>

        <div className="cd-panel__container">
            <div className="cd-panel__content">{children}</div>
        </div>
    </div>
)

export default SlidingPanel
