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
import AccountCard from '@components/AccountCard'

type AccountDetailsParams = {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    onLogOut: () => void
}

const AccountDetails: React.FC<AccountDetailsParams> = ({ account, tonWalletState, onLogOut }) => {
    const [modalVisible, setModalVisible] = useState(false)
    const [panelVisible, setPanelVisible] = useState(false)
    const [activeContent, setActiveContent] = useState(0)

    const handleSendReceive = (action: 'send' | 'receive') => {
        setPanelVisible(true)
        setActiveContent(+!(action === 'receive'))
    }

    const handleReceiveClick = () => {
        setPanelVisible(true)
        setActiveContent(0)
    }

    const handleSendClick = () => {
        setPanelVisible(true)
        setActiveContent(1)
    }

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
                <AccountCard
                    accountName={account.name}
                    address={account.tonWallet.address}
                    balance={convertTons(tonWalletState?.balance || '0').toLocaleString()}
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
            <SlidingPanel isOpen={panelVisible} setIsOpen={setPanelVisible}>
                {activeContent === 0 ? (
                    <Receive accountName={account.name} address={account.tonWallet.address} />
                ) : activeContent === 1 ? (
                    tonWalletState ? (
                        <Send
                            account={account}
                            tonWalletState={tonWalletState}
                            onBack={() => {
                                setPanelVisible(false)
                            }}
                        />
                    ) : (
                        <></>
                    )
                ) : activeContent === 2 ? (
                    <KeyStorage setActiveContent={setActiveContent} />
                ) : activeContent === 3 ? (
                    <CreateAccountScreen />
                ) : activeContent === 4 ? (
                    <EnterPassword setStep={setStep} minHeight={'170px'} />
                ) : activeContent === 5 ? (
                    <SaveSeed setStep={setStep} />
                ) : activeContent === 6 ? (
                    <AssetFull handleSendReceive={handleSendReceive} />
                ) : (
                    <></>
                )}
            </SlidingPanel>
        </>
    )
}

export default AccountDetails
