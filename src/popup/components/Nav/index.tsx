import React from 'react'

import Right from '@popup/img/right-arrow-blue.svg'
import Left from '@popup/img/left-arrow-blue.svg'

import './style.scss'

interface INav {
    title?: string
    hint?: string
    showPrev?: boolean
    showNext?: boolean
    onClickNext?: () => void
    onClickPrev?: () => void
}

const Nav = ({
    title,
    hint,
    showPrev,
    showNext,
    onClickNext,
    onClickPrev,
}: INav) => (
    <div className="nav">
        {(Boolean(title) || Boolean(hint)) && (
            <span className="nav__header">
                {title && (
                    <span className="nav__title">{title}</span>
                )}
                {hint && (
                    <span className="nav__title nav__title_hint">{hint}</span>
                )}
            </span>
        )}

        {(showPrev || showNext) && (
            <div className="nav__buttons">
                {showPrev && (
                    <div className="nav__button" onClick={onClickPrev}>
                        <img src={Left} alt="" />
                    </div>
                )}
                {showNext && (
                    <div className="nav__button" onClick={onClickNext}>
                        <img src={Right} alt="" />
                    </div>
                )}
            </div>
        )}
    </div>
)

export default Nav
