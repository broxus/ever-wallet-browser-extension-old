import React from 'react'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import './style.scss'

interface IWebsiteIcon {
    origin: string
}

const WebsiteIcon: React.FC<IWebsiteIcon> = ({ origin }) => {
    const rpcState = useRpcState()

    return (
        <img
            className="website-icon noselect"
            src={rpcState.state.domainMetadata[origin]?.icon}
            alt="page"
        />
    )
}

export default WebsiteIcon
