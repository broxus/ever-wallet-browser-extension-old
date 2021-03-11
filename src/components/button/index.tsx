import React from 'react'
import cn from 'classnames'
import { createRipple, removeRipple } from '../../common/ripple'

import './style.scss'

export type ButtonProps = {
    text: string
    white?: boolean
    onClick?: () => void
    disabled?: boolean
    noBorder?: boolean
}

export class Button extends React.Component<ButtonProps, {}> {
    render() {
        const { text, white, disabled, noBorder, onClick } = this.props
        let className = cn('button', { _white: white, _blue: !white, _disabled: disabled, _noborder: noBorder })

        return (
            <button
                className={className}
                onMouseDown={createRipple}
                onMouseLeave={removeRipple}
                onMouseUp={(event) => {
                    removeRipple(event)
                    onClick && onClick()
                }}
            >
                <div className="button__content">{text}</div>
            </button>
        )
    }
}
