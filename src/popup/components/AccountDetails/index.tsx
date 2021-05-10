import React, { useState } from 'react'
import { convertTons } from '@shared/utils'
import { createRipple, removeRipple } from '@popup/common'
import * as nt from '@nekoton'

import AccountModal from '@popup/components/AccountModal'
import AccountCard from '@popup/components/AccountCard'
import Carousel from '@popup/components/Carousel'

import ReceiveIcon from '@popup/img/receive.svg'
import SendIcon from '@popup/img/send.svg'
import DeployIcon from '@popup/img/deploy-icon.svg'
import Notifications from '@popup/img/notifications.svg'
import Profile from '@popup/img/profile.svg'
import AddAccount from '@popup/img/add-account.svg'

import './style.scss'

type AccountDetailsParams = {
    account: nt.AssetsList | undefined
    tonWalletState: nt.ContractState | undefined
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
                <AddAccount />
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

    if (account == null) {
        return null
    }

    const accountModalAction = (action: () => void) => () => {
        setModalVisible(false)
        action()
    }

    return (
        <>
            <div className="account-details">
                <div className="account-details__top-panel">
                    <Notifications />
                    <div className="account-details__network" onClick={onToggleNetwork}>
                        {network}
                    </div>
                    <div
                        onClick={() => setModalVisible(true)}
                        style={{ cursor: 'pointer', position: 'relative' }}
                    >
                        <Profile />
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
                </div>
                <Carousel
                    content={[
                        <AccountCard
                            accountName={account.name}
                            address={account.tonWallet.address}
                            publicKey={account?.tonWallet.publicKey}
                            balance={convertTons(tonWalletState?.balance || '0').toLocaleString()}
                        />,
                        // <AccountCard
                        //     accountName={account.name}
                        //     address={account.tonWallet.address}
                        //     publicKey={account?.tonWallet.publicKey}
                        //     balance={convertTons(tonWalletState?.balance || '0').toLocaleString()}
                        // />,
                        // <AccountCard
                        //     accountName={account.name}
                        //     address={account.tonWallet.address}
                        //     publicKey={account?.tonWallet.publicKey}
                        //     balance={convertTons(tonWalletState?.balance || '0').toLocaleString()}
                        // />,
                        // <AddNewAccountCard handleCreateNewAcc={onCreateAccount} />,
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
                            {/*@ts-ignore*/}
                            <ReceiveIcon style={{ marginRight: '8px' }} />
                            Receive
                        </div>
                    </button>

                    <button
                        className="account-details__controls__button"
                        onClick={() => {}}
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            if (
                                tonWalletState?.isDeployed ||
                                account.tonWallet.contractType == 'WalletV3'
                            ) {
                                onSend?.()
                            } else {
                                onDeploy?.()
                            }
                        }}
                    >
                        <div className="account-details__controls__button__content">
                            {tonWalletState?.isDeployed ||
                            account.tonWallet.contractType == 'WalletV3' ? (
                                <>
                                    {/*@ts-ignore*/}
                                    <SendIcon style={{ marginRight: '8px' }} />
                                    Send
                                </>
                            ) : (
                                <>
                                    {/*@ts-ignore*/}
                                    <DeployIcon style={{ marginRight: '8px' }} />
                                    Deploy
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </div>
        </>
    )
}

export default AccountDetails
