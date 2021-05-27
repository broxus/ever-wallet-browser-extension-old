import React, { useState } from 'react'
import { convertTons } from '@shared/utils'
import { createRipple, removeRipple } from '@popup/common'
import * as nt from '@nekoton'

import AccountModal from '@popup/components/AccountModal'
import AccountCard from '@popup/components/AccountCard'
import Carousel from '@popup/components/Carousel'
import Notifications from '@popup/components/Notifications'

import ReceiveIcon from '@popup/img/receive.svg'
import SendIcon from '@popup/img/send.svg'
import DeployIcon from '@popup/img/deploy-icon.svg'
import NotificationsIcon from '@popup/img/notifications.svg'
import Profile from '@popup/img/profile.svg'
import AddAccount from '@popup/img/add-account.svg'

import './style.scss'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

type AccountDetailsParams = {
    account: nt.AssetsList | undefined
    tonWalletState: nt.ContractState | undefined
    controllerState: ControllerState
    controllerRpc: IControllerRpcClient
    network: string
    onToggleNetwork: () => void
    onSend: () => void
    onReceive: () => void
    onDeploy: () => void
    onLogOut: () => void
    onCreateAccount: () => void
    onOpenKeyStore: () => void
}

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

const AccountDetails: React.FC<AccountDetailsParams> = ({
    account,
    tonWalletState,
    controllerState,
    controllerRpc,
    network,
    onToggleNetwork,
    onLogOut,
    onReceive,
    onSend,
    onDeploy,
    onCreateAccount,
    onOpenKeyStore,
}) => {
    const [modalVisible, setModalVisible] = useState(false)
    const [notificationsVisible, setNotificationsVisible] = useState(false)

    if (account == null) {
        return null
    }

    const accounts = Object.keys(controllerState.accountEntries)

    console.log('accounts', accounts)

    const accountModalAction = (action: () => void) => () => {
        setModalVisible(false)
        action()
    }

    return (
        <>
            <div className="account-details">
                <div className="account-details__top-panel">
                    <div
                        onClick={() => {
                            /*setNotificationsVisible(true)*/
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <img src={NotificationsIcon} alt="" />
                    </div>
                    <div className="account-details__network noselect" onClick={onToggleNetwork}>
                        {network}
                    </div>
                    <div
                        onClick={() => setModalVisible(true)}
                        style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        <img src={Profile} alt="" />
                    </div>
                    {modalVisible && (
                        <AccountModal
                            account={account}
                            tonWalletState={tonWalletState}
                            onCreateAccount={accountModalAction(onCreateAccount)}
                            onOpenKeyStore={accountModalAction(onOpenKeyStore)}
                            onLogOut={accountModalAction(onLogOut)}
                            onClose={accountModalAction(() => {})}
                        />
                    )}
                    {notificationsVisible && (
                        <Notifications onClose={() => setNotificationsVisible(false)} />
                    )}
                </div>
                <Carousel
                    controllerRpc={controllerRpc}
                    accountEntries={accountEntries}
                    content={[
                        ...accounts.map((el) => (
                            <AccountCard
                                accountName={account.name}
                                address={account.tonWallet.address}
                                publicKey={account?.tonWallet.publicKey}
                                balance={convertTons(
                                    tonWalletState?.balance || '0'
                                ).toLocaleString()}
                            />
                        )),

                        // <AccountCard
                        //     accountName={account.name}
                        //     address={account.tonWallet.address}
                        //     publicKey={account?.tonWallet.publicKey}
                        //     balance={convertTons(tonWalletState?.balance || '0').toLocaleString()}
                        // />,
                        <AddNewAccountCard handleCreateNewAcc={onCreateAccount} />,
                    ]}
                />

                <div className="account-details__controls noselect">
                    <button
                        className="account-details__controls__button"
                        onClick={() => {}}
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            onReceive?.()
                        }}
                    >
                        <div className="account-details__controls__button__content">
                            <img src={ReceiveIcon} alt="" style={{ marginRight: '8px' }} />
                            Receive
                        </div>
                    </button>

                    {tonWalletState && (
                        <button
                            className="account-details__controls__button"
                            onClick={() => {}}
                            onMouseDown={createRipple}
                            onMouseLeave={removeRipple}
                            onMouseUp={(event) => {
                                removeRipple(event)
                                if (
                                    tonWalletState.isDeployed ||
                                    account.tonWallet.contractType == 'WalletV3'
                                ) {
                                    onSend?.()
                                } else {
                                    onDeploy?.()
                                }
                            }}
                        >
                            <div className="account-details__controls__button__content">
                                {tonWalletState.isDeployed ||
                                account.tonWallet.contractType == 'WalletV3' ? (
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

export default AccountDetails
