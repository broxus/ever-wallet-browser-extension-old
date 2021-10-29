import * as React from 'react'
import RcSelect, { SelectProps } from 'rc-select'

import ArrowDown from '@popup/img/arrow-down.svg'

import './style.scss'

function InternalSelect<T>(props: SelectProps<T>, ref: React.Ref<RcSelect<T>>): JSX.Element {
    return (
        <RcSelect<T>
            ref={ref}
            transitionName="rc-slide-up"
            inputIcon={<img src={ArrowDown} alt="More" />}
            getPopupContainer={(trigger) => trigger.closest('.rc-select') || document.body}
            {...props}
        />
    )
}

export const Select = React.forwardRef(InternalSelect) as <T>(
    props: SelectProps<T> & { ref?: React.Ref<RcSelect<T>> }
) => React.ReactElement
