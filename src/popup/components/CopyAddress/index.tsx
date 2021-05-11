import React from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'
import { convertAddress } from '@shared/utils'
import './style.scss'

interface ICopyAddress {
    address: string
}
const CopyAddress: React.FC<ICopyAddress> = ({ address }) => (
    <>
        <CopyToClipboard
            text={address}
            onCopy={() => {
                ReactTooltip.hide()
            }}
        >
            <span className="clickable-address" data-tip="Click to copy">
                {/*{convertAddress(address)}*/}
                {address}
            </span>
        </CopyToClipboard>
        <ReactTooltip type="dark" effect="solid" place="bottom" />
    </>
)

export default CopyAddress
