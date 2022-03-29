import * as React from 'react'
import { useIntl } from 'react-intl'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'

import './style.scss'

type Props = {
    children: React.ReactNode
    id?: string
    text: string
}

export function CopyButton({ children, id = 'copy-button', text }: Props): JSX.Element {
    const intl = useIntl()
    return (
        <div
            data-tip={intl.formatMessage({ id: 'COPIED_TOOLTIP' })}
            data-for={id}
            data-event="click focus"
        >
            <CopyToClipboard text={text}>{children}</CopyToClipboard>
            <ReactTooltip id={id} type="dark" effect="solid" place="top" />
        </div>
    )
}
