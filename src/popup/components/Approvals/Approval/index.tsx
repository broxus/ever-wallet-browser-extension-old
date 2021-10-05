import React from 'react'
import * as nt from '@nekoton'

import './style.scss'
import UserAvatar from '@popup/components/UserAvatar'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import WebsiteIcon from '@popup/components/WebsiteIcon'

export type ApprovalProps = {
    title: string
    origin: string
    account: nt.AssetsList
    className?: string
}

export const Approval: React.FC<ApprovalProps> = ({
    title,
    origin,
    account,
    className,
    children,
}) => {
    const rpcState = useRpcState()

    const networkName = rpcState.state.selectedConnection.name

    return (
        <>
            <div className={`approval${className != null ? ` ${className}` : ''}`}>
                <div className="approval__top-panel">
                    <div className="approval__top-panel__network">
                        <div className="approval__address-entry">
                            <UserAvatar address={account.tonWallet.address} small />
                            <div className="approval__top-panel__account">{account?.name}</div>
                        </div>
                        <div className="approval__network" style={{ marginBottom: '0' }}>
                            {networkName}
                        </div>
                    </div>
                    <div className="approval__top-panel__site">
                        <WebsiteIcon origin={origin} />
                        <div className="approval__address-entry">{origin}</div>
                    </div>
                    <h3 className="approval__top-panel__header noselect">{title}</h3>
                </div>
                {children}
            </div>
        </>
    )
}

export default Approval
