import * as React from 'react'

import { createRipple, removeRipple } from '@popup/common'
import { AccountCard } from '@popup/components/AccountCard'
import { AccountModal } from '@popup/components/AccountModal'
import { Carousel } from '@popup/components/Carousel'
import Notifications from '@popup/components/Notifications'
import { useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import AddAccount from '@popup/img/add-account.svg'
import DeployIcon from '@popup/img/deploy-icon.svg'
import NotificationsIcon from '@popup/img/notifications.svg'
import ReceiveIcon from '@popup/img/receive.svg'
import SendIcon from '@popup/img/send.svg'

import { ConnectionDataItem } from '@shared/backgroundApi'
import { ENVIRONMENT_TYPE_NOTIFICATION } from '@shared/constants'
import { convertTons } from '@shared/utils'

import './style.scss'

interface IAddNewAccountCard {
    handleCreateNewAcc: (arg0: number) => void
}

const AddNewAccountCard: React.FC<IAddNewAccountCard> = ({ handleCreateNewAcc }) => {
    return (
        <div className="new-account">
            {/*@ts-ignore*/}
            <div onClick={() => handleCreateNewAcc()} className="new-account-icon">
                <img src={AddAccount} alt="" />
            </div>
            <div className="new-account-title">Add account</div>
            <div className="new-account-comment">
                You can create a new account or add created one
            </div>
        </div>
    )
}

const INITIAL_DATA_KEY = 'initial_data'

export function AccountDetails(): JSX.Element {
    const manager = useAccountsManagement()
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [notificationsVisible, setNotificationsVisible] = React.useState(false)

    const initialSlide = React.useMemo(
        () =>
            manager.accounts.findIndex(
                (account) => account.tonWallet.address === manager.accountAddress
            ),
        [manager.currentAccount]
    )

    const onReceive = () => {
        drawer.setPanel(Panel.RECEIVE)
    }

    const onDeploy = () => {
        drawer.setPanel(Panel.DEPLOY)
    }

    const onSend = async () => {
        if (rpcState.activeTab?.type == ENVIRONMENT_TYPE_NOTIFICATION) {
            drawer.setPanel(Panel.SEND)
        } else {
            await rpc.tempStorageInsert(INITIAL_DATA_KEY, Panel.SEND)
            await rpc.openExtensionInExternalWindow()
            window.close()
        }
    }

    const onCreateAccount = () => {
        drawer.setPanel(Panel.CREATE_ACCOUNT)
    }

    const onToggleNetwork = async () => {
        const networks = await rpc.getAvailableNetworks()
        const networkId = rpcState.state?.selectedConnection.id

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

    const onSlide = async (index: number) => {
        const account = manager.accounts[index]
        if (
            account == null ||
            account.tonWallet.address === manager.selectedAccount?.tonWallet.address
        ) {
            return
        }
        await rpc.selectAccount(account.tonWallet.address)
    }

    return (
        <>
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
                        {rpcState.state?.selectedConnection.name}
                    </div>
                    <AccountModal />
                    {notificationsVisible && (
                        <Notifications onClose={() => setNotificationsVisible(false)} />
                    )}
                </div>
                <Carousel initialSlide={initialSlide} onChange={onSlide}>
                    {manager.accounts.map((account) => (
                        <AccountCard
                            key={account.tonWallet.address}
                            accountName={account.name}
                            address={account.tonWallet.address}
                            publicKey={account.tonWallet.publicKey}
                            balance={convertTons(
                                manager.tonWalletState?.balance || '0'
                            ).toLocaleString()}
                        />
                    ))}
                    <AddNewAccountCard key="addSlide" handleCreateNewAcc={onCreateAccount} />
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

                    {manager.tonWalletState !== undefined && (
                        <button
                            className="account-details__controls__button"
                            onClick={() => {}}
                            onMouseDown={createRipple}
                            onMouseLeave={removeRipple}
                            onMouseUp={async (event) => {
                                removeRipple(event)
                                if (
                                    manager.tonWalletState?.isDeployed ||
                                    manager.selectedAccount?.tonWallet.contractType == 'WalletV3'
                                ) {
                                    await onSend()
                                } else {
                                    onDeploy()
                                }
                            }}
                        >
                            <div className="account-details__controls__button__content">
                                {manager.tonWalletState?.isDeployed ||
                                manager.selectedAccount?.tonWallet.contractType == 'WalletV3' ? (
                                    <>
                                        <img src={SendIcon} alt="" style={{ marginRight: '8px' }} />
                                        Send
                                    </>
                                ) : (
                                    <>
                                        <img
                                            src={DeployIcon}
                                            alt=""
                                            style={{ marginRight: '8px' }}
                                        />
                                        Deploy
                                    </>
                                )}
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}
