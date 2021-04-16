import React, { Dispatch, SetStateAction, useState } from 'react'
import cn from 'classnames'
import { createRipple, removeRipple } from '@common'

import './style.scss'

type IButton = {
    text: string
    type?: 'button' | 'submit' | 'reset' | undefined
    form?: string
    white?: boolean
    onClick?: () => void
    disabled?: boolean
    noBorder?: boolean
}

const Button: React.FC<IButton> = ({ text, white, disabled, noBorder, onClick, type, form }) => {
    let className = cn('button', {
        _white: white,
        _blue: !white,
        _disabled: disabled,
        _noborder: noBorder,
    })

    return (
        <>
            <button
                type={type}
                form={form}
                className={className}
                onClick={() => {}}
                onMouseDown={(e) => {
                    createRipple(e)
                }}
                onMouseLeave={(e) => {
                    removeRipple(e)
                }}
                onMouseUp={(event) => {
                    removeRipple(event)
                    onClick?.()
                }}
            >
                <div className="button__content">{text}</div>
            </button>
        </>
    )
}

export default Button
