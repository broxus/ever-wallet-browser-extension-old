import React, { useState } from 'react'
import { convertTons } from '@utils'
import { createRipple, removeRipple } from '@common'

import * as nt from '@nekoton'
import SlidingPanel from '@components/SlidingPanel'
import Receive from '@components/Receive'
import Send from '@components/Send'
import KeyStorage from '@components/KeyStorage'
import AccountModal from '@components/AccountModal'
import AssetFull from '@components/AssetFull'
import EnterPassword from '@components/EnterPassword'
import CreateAccountScreen from '../../pages/CreateAccount'

import ReceiveIcon from '@img/receive.svg'
import SendIcon from '@img/send.svg'
import Notifications from '@img/notifications.svg'
import Profile from '@img/profile.svg'
import AddAccount from '@img/add-account.svg'
import AccountCard from '@components/AccountCard'
import Carousel from '@components/Carousel'
import './style.scss'

type AccountDetailsParams = {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    handleSendClick: () => void
    handleReceiveClick: () => void
    onLogOut: () => void
}

const AddNewAccountCard: React.FC = () => {
    return (
        <div className="new-account">
            {/*@ts-ignore*/}
            <AddAccount style={{ cursor: 'pointer' }} />
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
    handleReceiveClick,
    handleSendClick,
}) => {
    const [modalVisible, setModalVisible] = useState(false)

    if (account == null) {
        return null
    }

    return (
        <>
            <div className="main-page__account-details">
                <div className="main-page__account-details-top-panel">
                    <Notifications />
                    <div className="main-page__account-details-network">Mainnet</div>
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
                            onCreateAccount={() => {
                                // TODO: create account
                            }}
                            onOpenKeyStore={() => {
                                // TODO: open key store
                            }}
                            onLogOut={onLogOut}
                            onClose={() => {
                                setModalVisible(false)
                            }}
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
                        <AddNewAccountCard />,
                    ]}
                />

                <div className="main-page__account-details-buttons">
                    <button
                        className="main-page__account-details-button _blue"
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            handleReceiveClick && handleReceiveClick()
                        }}
                    >
                        <div className="main-page__account-details-button__content">
                            {/*@ts-ignore*/}
                            <ReceiveIcon style={{ marginRight: '8px' }} />
                            Receive
                        </div>
                    </button>

                    <button
                        className="main-page__account-details-button _blue"
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            handleSendClick && handleSendClick()
                        }}
                    >
                        <div className="main-page__account-details-button__content">
                            {/*@ts-ignore*/}
                            <SendIcon style={{ marginRight: '8px' }} />
                            Send
                        </div>
                    </button>
                </div>
            </div>
        </>
    )
}

export default AccountDetails
