import React, { useState } from 'react'
import { convertAddress, convertTons } from '@utils'
import { createRipple, removeRipple } from '@common'
import * as nt from '@nekoton'

import ReactTooltip from 'react-tooltip'
import CopyToClipboard from 'react-copy-to-clipboard'

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
import UserPic from '@img/user-avatar-placeholder.svg'

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
                    <div className="main-page__account-details-network">Free TON main net</div>
                    <div
                        onClick={() => setModalVisible(true)}
                        // style={{ cursor: 'pointer', position: 'relevant' }}
                        style={{ cursor: 'pointer' }}
                    >
                        <UserPic />
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
                <div className="main-page__account-details-acc">
                    <span className="main-page__account-details-acc-account">{account.name}</span>
                    <CopyToClipboard
                        text={account.tonWallet.address}
                        onCopy={() => {
                            ReactTooltip.hide()
                        }}
                    >
                        <span
                            className="main-page__account-details-acc-address"
                            data-tip="Click to copy"
                        >
                            {convertAddress(account.tonWallet.address)}
                        </span>
                    </CopyToClipboard>
                    <ReactTooltip type="dark" effect="solid" place="bottom" />
                </div>
                <div className="main-page__account-details-balance">
                    <span className="main-page__account-details-balance-number">
                        {convertTons(tonWalletState?.balance || '0').toLocaleString()} TON
                    </span>
                    <span className="main-page__account-details-balance-comment">
                        Total portfolio value
                    </span>
                </div>
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
