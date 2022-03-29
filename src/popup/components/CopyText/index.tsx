import * as React from 'react'
import { useIntl } from 'react-intl'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'

import './style.scss'

type Place = 'top' | 'right' | 'bottom' | 'left'

type Props = {
    children?: React.ReactNode
    className?: string
    id?: string
    place?: Place
    text: string
}

export function CopyText({ children, className, id, place = 'top', text }: Props): JSX.Element {
    const intl = useIntl()
    const [isCopied, setCopied] = React.useState(false)

    React.useEffect(() => {
        ReactTooltip.rebuild()
    }, [isCopied])

    return (
        <>
            <CopyToClipboard
                text={text}
                onCopy={() => {
                    setCopied(true)
                }}
            >
                <span
                    className={className}
                    data-tip=""
                    data-for={id}
                    onMouseLeave={() => {
                        setCopied(false)
                    }}
                >
                    {children || text}
                </span>
            </CopyToClipboard>
            <ReactTooltip
                id={id}
                type="dark"
                effect="solid"
                place={place}
                getContent={() =>
                    isCopied
                        ? intl.formatMessage({ id: 'COPIED_TOOLTIP' })
                        : intl.formatMessage({ id: 'CLICK_TO_COPY_TOOLTIP' })
                }
            />
        </>
    )
}
