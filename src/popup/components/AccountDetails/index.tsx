import React, { useState } from 'react'
import { convertTons } from '@utils'
import { createRipple, removeRipple } from '@common'

import * as nt from '@nekoton'
import AccountModal from '@components/AccountModal'

import ReceiveIcon from '@img/receive.svg'
import SendIcon from '@img/send.svg'
import DeployIcon from '@img/deploy-icon.svg'
import Notifications from '@img/notifications.svg'
import Profile from '@img/profile.svg'
import AddAccount from '@img/add-account.svg'
import AccountCard from '@components/AccountCard'
import Carousel from '@components/Carousel'

import './style.scss'

type AccountDetailsParams = {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
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
                    <div className="account-details__network">Mainnet</div>
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
