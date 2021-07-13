import React from 'react'
import { ConnectionDataItem } from '@shared/backgroundApi'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import './style.scss'
import { hideModalOnClick } from '@popup/common'
import classNames from 'classnames'

export function NetworkSettings(): JSX.Element {
    const rpc = useRpc()
    const rpcState = useRpcState()

    const iconRef = React.useRef(null)
    const wrapperRef = React.useRef(null)

    const [availableNetworks, setNetworks] = React.useState<ConnectionDataItem[]>([])
    const [isActive, setActiveTo] = React.useState(false)

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

    return (
        <>
            <div
                className="network-settings__network-switcher noselect"
                onClick={toggle}
                ref={iconRef}
            >
                {rpcState.state.selectedConnection.name}
            </div>
            {isActive && (
                <div ref={wrapperRef} className="network-settings">
                    <div className="network-settings-section">
                        <div className="network-settings-section-header">Available networks</div>

                        <ul className="network-settings__networks-list">
                            {availableNetworks.map((network) => (
                                <li key={network.id}>
                                    <a
                                        role="button"
                                        className={classNames(
                                            'network-settings__networks-list-item',
                                            {
                                                'network-settings__networks-list-item--active':
                                                    network.id ===
                                                    rpcState.state.selectedConnection.id,
                                            }
                                        )}
                                        onClick={onSelectNetwork(network)}
                                    >
                                        <div className="network-settings__networks-list-item-title">
                                            {network.name}
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </>
    )
}
