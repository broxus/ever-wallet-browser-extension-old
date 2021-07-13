import * as React from 'react'
import RcSelect, { SelectProps } from 'rc-select'

import ArrowDown from '@popup/img/arrow-down.svg'
import './style.scss'

export function Select<VT>(props: SelectProps<VT>): JSX.Element {
    return (
        <RcSelect<VT>
            transitionName="rc-slide-up"
            inputIcon={<img src={ArrowDown} alt="More" />}
            getPopupContainer={(trigger) =>
                trigger.closest('.rc-select') || document.getElementById('root') || document.body
            }
            {...props}
        />
    )
}
