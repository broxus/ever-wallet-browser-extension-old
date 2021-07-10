import * as React from 'react'
import { Carousel as ReactCarousel } from 'react-responsive-carousel'

import { createRipple, removeRipple } from '@popup/common'
import { AccountCard } from '@popup/components/AccountCard'
import { AddNewAccountCard } from '@popup/components/AddNewAccountCard'
import { AccountModal } from '@popup/components/AccountModal'
import { Carousel } from '@popup/components/Carousel'
import Notifications from '@popup/components/Notifications'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { debounce } from '@popup/utils/debounce'
import { getScrollWidth } from '@popup/utils/getScrollWidth'

import DeployIcon from '@popup/img/deploy-icon.svg'
import NotificationsIcon from '@popup/img/notifications.svg'
import ReceiveIcon from '@popup/img/receive.svg'
import SendIcon from '@popup/img/send.svg'

import { ConnectionDataItem } from '@shared/backgroundApi'
import { convertTons } from '@shared/utils'

import './style.scss'


export function AccountDetails(): JSX.Element {
    const accountability = useAccountability()
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const slider = React.useRef<ReactCarousel>(null)

    const [notificationsVisible, setNotificationsVisible] = React.useState(false)

    const scrollWidth = React.useMemo(() => getScrollWidth(), [])

    const initialSelectedAccountIndex = React.useMemo(() => {
        const index = accountability.accounts.findIndex(
            (account) => account.tonWallet.address === accountability.selectedAccountAddress
        )
        return index >= 0 ? index : 0
    }, [accountability.accounts.length])

    const onReceive = () => {
        drawer.setPanel(Panel.RECEIVE)
    }

    const onDeploy = () => {
        drawer.setPanel(Panel.DEPLOY)
    }

    const onSend = async () => {
        await rpc.openExtensionInExternalWindow({
            group: 'send',
            width: 360 + scrollWidth - 1,
            height: 600 + scrollWidth - 1,
        })
        window.close()
    }

    const onToggleNetwork = async () => {
        const networks = await rpc.getAvailableNetworks()
        const networkId = rpcState.state.selectedConnection.id

        let nextNetwork: ConnectionDataItem | undefined
        for (let i = 0; i < networks.length; ++i) {
            const item = networks[i]
            if (item.id == networkId) {
                nextNetwork = networks[(i + 1) % networks.length]
            }
        }

        console.log('Next network:', nextNetwork)
        nextNetwork && (await rpc.changeNetwork(nextNetwork))
    }

    const onSlide = debounce( async (index: number) => {
        // if not a last slide
        if (accountability.accounts.length === index) {
            const account = accountability.accounts[index - 1]
            if (account === undefined || account?.tonWallet.address === accountability.selectedAccountAddress) {
                return
            }
            await rpc.selectAccount(account.tonWallet.address)
        }

        const account = accountability.accounts[index]

        if (account === undefined || account?.tonWallet.address === accountability.selectedAccountAddress) {
            return
        }

        await rpc.selectAccount(account.tonWallet.address)
    }, 500)

    React.useEffect(() => {
        const index = accountability.accounts.findIndex(
            (account) => account.tonWallet.address === accountability.selectedAccountAddress
        )
        const selectedItem = slider.current?.state.selectedItem

        if (index === selectedItem || accountability.accounts.length === selectedItem) {
            return
        }

        slider.current?.setPosition(index >= 0 ? index : 0)
    }, [accountability.selectedAccountAddress])

    return (
        <div className="account-details">
            <div className="account-details__top-panel">
                <div
                    className="account-details__notification-bell"
                    onClick={() => {
                        /*setNotificationsVisible(true)*/
                    }}
                >
                    <img src={NotificationsIcon} alt="" />
                </div>
                <div
                    className="account-details__network-switcher noselect"
                    onClick={onToggleNetwork}
                >
                    {rpcState.state.selectedConnection.name}
                </div>
                <AccountModal />
                {notificationsVisible && (
                    <Notifications onClose={() => setNotificationsVisible(false)} />
                )}
            </div>

            <Carousel ref={slider} selectedItem={initialSelectedAccountIndex} onChange={onSlide}>
                {accountability.accounts.map((account) => (
                    <AccountCard
                        key={account.tonWallet.address}
                        accountName={account.name}
                        address={account.tonWallet.address}
                        publicKey={account.tonWallet.publicKey}
                        balance={convertTons(
                            rpcState.state.accountContractStates?.[account.tonWallet.address]
                                ?.balance || '0'
                        ).toLocaleString()}
                    />
                ))}
                <AddNewAccountCard key="addSlide" />
            </Carousel>

            <div className="account-details__controls noselect">
                <button
                    className="account-details__controls__button"
                    onClick={() => {}}
                    onMouseDown={createRipple}
                    onMouseLeave={removeRipple}
                    onMouseUp={(event) => {
                        removeRipple(event)
                        onReceive()
                    }}
                >
                    <div className="account-details__controls__button__content">
                        <img src={ReceiveIcon} alt="" style={{ marginRight: '8px' }} />
                        Receive
                    </div>
                </button>

                {accountability.tonWalletState !== undefined && (
                    <button
                        className="account-details__controls__button"
                        onClick={() => {}}
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={async (event) => {
                            removeRipple(event)
                            if (
                                accountability.tonWalletState?.isDeployed ||
                                accountability.selectedAccount?.tonWallet.contractType == 'WalletV3'
                            ) {
                                await onSend()
                            } else {
                                onDeploy()
                            }
                        }}
                    >
                        <div className="account-details__controls__button__content">
                            {accountability.tonWalletState?.isDeployed ||
                            accountability.selectedAccount?.tonWallet.contractType == 'WalletV3' ? (
                                <>
                                    <img src={SendIcon} alt="" style={{ marginRight: '8px' }} />
                                    Send
                                </>
                            ) : (
                                <>
                                    <img src={DeployIcon} alt="" style={{ marginRight: '8px' }} />
                                    Deploy
                                </>
                            )}
                        </div>
                    </button>
                )}
            </div>
        </div>
    )
}
