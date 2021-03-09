import React from 'react'
import cn from 'classnames'
import { createRipple, removeRipple } from '../../common/ripple'

import './style.scss'

export type ButtonProps = {
    text: string
    white?: boolean
    onClick?: () => void
}

export class Button extends React.Component<ButtonProps, {}> {
    render() {
        const { text, white, onClick } = this.props
        let className = cn('button', { _white: white, _blue: !white })

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
