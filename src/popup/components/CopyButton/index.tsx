import React from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'

import './style.scss'

interface ICopyButton {
    children: JSX.Element
    text: string
}
const CopyButton: React.FC<ICopyButton> = ({ children, text }) => {
    return (
        <>
            <ReactTooltip type={'dark'} effect={'solid'} globalEventOff="click" />
            <div className="panel" data-tip="Copied!" data-event="click focus">
                <CopyToClipboard text={text} onCopy={() => {}}>
                    {children}
                </CopyToClipboard>
            </div>
        </>
    )
}
export default CopyButton
