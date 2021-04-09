import React, { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import UserPic from '../../img/user-avatar-placeholder.svg'
import ReceiveIcon from '../../img/receive.svg'
import SendIcon from '../../img/send.svg'
import TonLogo from '../../img/ton-logo.svg'
import TonLogoS from '../../img/ton-logo-s.svg'
import USDTLogoS from '../../img/usdt-logo-s.svg'
import Arrow from '../../img/arrow.svg'
import { Button } from '../../components/button'
import { createRipple, removeRipple } from '../../common/ripple'
import SlidingPanel from '../../components/SlidingPanel/SlidingPanel'
import Send from '../../components/Send/Send'
import Receive from '../../components/Receive/Receive'
import AddNewToken from '../../components/AddNewToken/AddNewToken'
import { connect } from 'react-redux'
import { AppState } from '../../store/app/types'
import { checkBalance } from '../../store/app/actions'
import KeyStorage from '../../components/KeyStorage/KeyStorage'
import CreateAccountScreen from '../CreateAccount/CreateAccountScreen'
import EnterPassword from '../../components/EnterPassword/EnterPassword'
import SaveSeed from '../../components/SaveSeed/SaveSeed'
import AssetFull from '../../components/AssetFull/AssetFull'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'
import AccountModal from '../../components/AccountModal/AccountModal'
import './main-page.scss'

const AccountDetails: React.FC<any> = ({ parentStep, account, setGlobalStep }) => {
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
                    <span className="main-page__account-details-balance-number"> $1,200.00</span>
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
                    <AssetFull />
                ) : (
                    <></>
                )}
            </SlidingPanel>
        </>
    )
}

export const Asset = () => (
    <div className="main-page__user-assets-asset">
        <div style={{ display: 'flex' }}>
            {/*// @ts-ignore*/}
            <TonLogo style={{ marginRight: '16px', minWidth: '40px' }} />
            <div className="main-page__user-assets-asset-number">
                <span className="main-page__user-assets-asset-number-amount">204.00 TON</span>
                <span className="main-page__user-assets-asset-number-dollars">$100.00</span>
            </div>
        </div>
        <Arrow />
    </div>
)

const Assets: React.FC<any> = ({ setActiveContent }) => {
    const [panelVisible, setPanelVisible] = useState(false)

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            {/*TODO remove later*/}
            <div onClick={() => setActiveContent(6)}>
                <Asset />
                <Asset />
                <Asset />
            </div>
            {/*<div*/}
            {/*    style={{*/}
            {/*        width: '100%',*/}
            {/*        height: '70px',*/}
            {/*        background:*/}
            {/*            'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 44%)',*/}
            {/*        bottom: 0,*/}
            {/*        position: 'absolute',*/}
            {/*    }}*/}
            {/*></div>*/}
            {/*<div style={{ width: '148px', position: 'absolute', bottom: '0', left: '85px' }}>*/}
            <div style={{ marginBottom: '32px' }}>
                <Button text={'Add new asset'} white onClick={() => setPanelVisible(true)} />
            </div>
            {/*</div>*/}
            <SlidingPanel isOpen={panelVisible} setIsOpen={setPanelVisible}>
                <AddNewToken onReturn={setPanelVisible} />
            </SlidingPanel>
        </div>
    )
}

const Transaction = () => {
    return (
        <>
            <div className="main-page__user-assets-asset">
                <div style={{ display: 'flex', width: '100%' }}>
                    {/*// @ts-ignore*/}
                    <TonLogoS style={{ marginRight: '16px', minWidth: '36px' }} />
                    <div className="main-page__user-assets-asset-number">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-amount">
                                0xa55d...0D8D
                            </span>
                            <span className="main-page__user-assets-asset-number-income">
                                + 204.00 TON
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-dollars">
                                14:56
                            </span>
                            <span className="main-page__user-assets-asset-number-dollars">
                                Fees: 0.00034 TON
                            </span>
                        </div>
                        <span
                            className="main-page__user-assets-asset-number-dollars"
                            style={{ color: '#000000', padding: '10px 0 0' }}
                        >
                            Staking reward.
                        </span>
                    </div>
                </div>
            </div>
            <div className="main-page__user-assets-asset">
                <div style={{ display: 'flex', width: '100%' }}>
                    {/*// @ts-ignore*/}
                    <USDTLogoS style={{ marginRight: '16px', minWidth: '36px' }} />
                    <div className="main-page__user-assets-asset-number">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-amount">
                                0xa55d...0D8D
                            </span>
                            <span className="main-page__user-assets-asset-number-expense">
                                - 1,076.00 USDT
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-dollars">
                                2:27
                            </span>
                            <span className="main-page__user-assets-asset-number-dollars">
                                Fees: 0.00034 TON
                            </span>
                        </div>
                        <span
                            className="main-page__user-assets-asset-number-dollars"
                            style={{ color: '#000000', padding: '10px 0 0' }}
                        >
                            Ordinary stake.
                        </span>
                    </div>
                </div>
            </div>
        </>
    )
}

const Transactions = () => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
        }}
    >
        {/*<div style={{ overflowY: 'scroll', maxHeight: '260px' }}>*/}
        <Transaction />
        <Transaction />
        <Transaction />
        {/*</div>*/}
        {/*<div*/}
        {/*    style={{*/}
        {/*        width: '100%',*/}
        {/*        height: '70px',*/}
        {/*        background:*/}
        {/*            'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 44%)',*/}
        {/*        bottom: 0,*/}
        {/*        position: 'absolute',*/}
        {/*    }}*/}
        {/*/>*/}
    </div>
)

const UserAssets: React.FC<any> = ({ setActiveContent }) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = [<Assets setActiveContent={setActiveContent} />, <Transactions />]

    return (
        <>
            <div className="main-page__user-assets">
                <div className="main-page__user-assets-panel">
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab === 0,
                        })}
                        onClick={() => setActiveTab(0)}
                    >
                        Assets
                    </div>
                    <div
                        className={cn('main-page__user-assets-panel-tab', {
                            _active: activeTab === 1,
                        })}
                        onClick={() => setActiveTab(1)}
                    >
                        Transactions
                    </div>
                </div>
                {content[activeTab]}
            </div>
        </>
    )
}

interface IMainPageScreen {
    account: string
    setStep: (arg0: number) => void
    checkBalance: (arg0: string) => void
}

const MainPageScreen: React.FC<IMainPageScreen> = ({ account, setStep, checkBalance }) => {
    const [activeContent, setActiveContent] = useState(0)

    useEffect(() => {
        checkBalance(account)
    }, [])

    return (
        <>
            <AccountDetails parentStep={activeContent} account={account} setGlobalStep={setStep} />
            <UserAssets setActiveContent={setActiveContent} />
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    account: store.app.account,
})

export default connect(mapStateToProps, {
    checkBalance,
})(MainPageScreen)
