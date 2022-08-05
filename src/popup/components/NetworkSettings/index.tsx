import React from 'react'
import { useIntl } from 'react-intl'
import { ConnectionDataItem } from '@shared/backgroundApi'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import './style.scss'
import { hideModalOnClick } from '@popup/common'
import classNames from 'classnames'

export function NetworkSettings(): JSX.Element {
    const intl = useIntl()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const iconRef = React.useRef(null)
    const wrapperRef = React.useRef(null)

    const [availableNetworks, setNetworks] = React.useState<ConnectionDataItem[]>([])
    const [isActive, setActiveTo] = React.useState(false)

    const currentNetwork = rpcState.state.selectedConnection

    const onSelectNetwork = (network: ConnectionDataItem) => {
        return async () => {
            hide()
            await rpc.changeNetwork(network)
        }
    }

    const toggle = () => {
        setActiveTo(!isActive)
    }

    const hide = () => {
        setActiveTo(false)
    }

    React.useEffect(() => {
        ;(async () => {
            setNetworks(await rpc.getAvailableNetworks())
        })()
    }, [])

    hideModalOnClick(wrapperRef, iconRef, hide)

    const makeNetworkTitle = () => {
        const pendingNetwork = rpcState.state.pendingConnection
        if (pendingNetwork == null || pendingNetwork.connectionId == currentNetwork.connectionId) {
            return currentNetwork.name
        } else {
            return `${pendingNetwork.name}...`
        }
    }

    return (
        <>
            <div
                className="network-settings__network-switcher noselect"
                onClick={toggle}
                ref={iconRef}
            >
                {makeNetworkTitle()}
            </div>
            {isActive && (
                <div ref={wrapperRef} className="network-settings noselect">
                    <div className="network-settings-section">
                        <div className="network-settings-section-header">
                            {intl.formatMessage({
                                id: 'NETWORK_TOGGLE_HEADER',
                            })}
                        </div>

                        <ul className="network-settings__networks-list">
                            {availableNetworks.map((network) => {
                                const current = network.connectionId == currentNetwork.connectionId

                                const className = classNames(
                                    'network-settings__networks-list-item',
                                    { 'network-settings__networks-list-item--active': current }
                                )

                                const onClick = current ? undefined : onSelectNetwork(network)

                                return (
                                    <li key={network.connectionId}>
                                        <a role="button" className={className} onClick={onClick}>
                                            <div className="network-settings__networks-list-item-title">
                                                {network.name}
                                            </div>
                                        </a>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
            )}
        </>
    )
}
