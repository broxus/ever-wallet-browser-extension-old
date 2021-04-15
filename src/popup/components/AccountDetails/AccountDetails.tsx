import React, { useEffect, useState } from 'react'
import UserPic from '../../img/user-avatar-placeholder.svg'
import AccountModal from '../AccountModal/AccountModal'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'
import { createRipple, removeRipple } from '../../common/ripple'
import ReceiveIcon from '../../img/receive.svg'
import SendIcon from '../../img/send.svg'
import SlidingPanel from '../SlidingPanel/SlidingPanel'
import Receive from '../Receive/Receive'
import Send from '../Send/Send'
import KeyStorage from '../KeyStorage/KeyStorage'
import CreateAccountScreen from '../../pages/CreateAccount/CreateAccountScreen'
import EnterPassword from '../EnterPassword/EnterPassword'
import SaveSeed from '../SaveSeed/SaveSeed'
import AssetFull from '../AssetFull/AssetFull'
import * as nt from '../../../../nekoton/pkg'
import {convertTons} from "../../utils/formatData";

type AccountDetailsParams = {
    parentStep: number
    tonWalletState: nt.AccountState | null
    account: string
    setGlobalStep: (arg0: number) => void
}

const AccountDetails: React.FC<AccountDetailsParams> = ({
    parentStep,
    tonWalletState,
    account,
    setGlobalStep,
}) => {
    const [modalVisible, setModalVisible] = useState(false)
    const [panelVisible, setPanelVisible] = useState(false)
    const [activeContent, setActiveContent] = useState(0)

    // TODO temp hack, remove later
    const [step, setStep] = useState(0)

    useEffect(() => {
        if (parentStep === 6) {
            setPanelVisible(true)
            setActiveContent(6)
        }
    }, [parentStep])
    // TODO temp hack, remove later

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
                            setActiveContent={setActiveContent}
                            setPanelVisible={setPanelVisible}
                            setModalVisible={setModalVisible}
                            setStep={setGlobalStep}
                        />
                    )}
                </div>
                <div className="main-page__account-details-acc">
                    <span className="main-page__account-details-acc-account"> Account 1</span>
                    <CopyToClipboard
                        text={account}
                        onCopy={() => {
                            ReactTooltip.hide()
                        }}
                    >
                        <span
                            className="main-page__account-details-acc-address"
                            data-tip="Click to copy"
                        >
                            {`${account.slice(0, 6)}...${account.slice(-4)}`}
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
                    <Receive onReturn={setPanelVisible} />
                ) : activeContent === 1 ? (
                    <Send onReturn={setPanelVisible} />
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
