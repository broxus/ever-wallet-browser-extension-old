import React, { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import './copy-button.scss'
import ReactTooltip from 'react-tooltip'

interface ICopyButton {
    children: JSX.Element
    text: string
}
const CopyButton: React.FC<ICopyButton> = ({ children, text }) => {
    const [copied, setCopied] = useState(false)

    return (
        <>
            <ReactTooltip type={'dark'} effect={'solid'} globalEventOff="click" />
            <div className="panel" data-tip="Copied!" data-event="click focus">
                <CopyToClipboard text={text} onCopy={() => setCopied(true)}>
                    {children}
                </CopyToClipboard>
            </div>
        </>
    )
}
export default CopyButton
