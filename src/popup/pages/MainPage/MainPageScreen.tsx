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
import {
    addKey,
    createKey,
    getCurrentAccount,
    restoreKey,
} from '../../store/app/actions'
import KeyStorage from '../../components/KeyStorage/KeyStorage'
import CreateAccountScreen from '../CreateAccount/CreateAccountScreen'
import EnterPassword from '../../components/EnterPassword/EnterPassword'
import SaveSeed from '../../components/SaveSeed/SaveSeed'
import AssetFull from '../../components/AssetFull/AssetFull'
import { GeneratedMnemonic } from '../../../../nekoton/pkg'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'
import './main-page.scss'
import AccountModal from '../../components/AccountModal/AccountModal'

const AccountDetails: React.FC<any> = ({ parentStep, account }) => {
    const [modalVisible, setModalVisible] = useState(false)
    const [panelVisible, setPanelVisible] = useState(false)
    const [activeContent, setActiveContent] = useState(0)
    const [copied, setCopied] = useState(false)

    // TODO temp hack, remove later
    const [step, setStep] = useState(0)
    useEffect(() => {
        setActiveContent(5)
    }, [step])

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
        <div style={{ overflowY: 'scroll', maxHeight: '260px' }}>
            <Transaction />
            <Transaction />
            <Transaction />
        </div>
        <div
            style={{
                width: '100%',
                height: '70px',
                background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 44%)',
                bottom: 0,
                position: 'absolute',
            }}
        />
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
    getCurrentAccount: (arg0: string) => void
    publicKey: string
    phrase: GeneratedMnemonic
    createKey: (phrase: GeneratedMnemonic, password: string) => Promise<void>
    account: string
    store: any
}

const MainPageScreen: React.FC<IMainPageScreen> = ({
    getCurrentAccount,
    publicKey,
    phrase,
    createKey,
    account,
    store,
}) => {
    const [activeContent, setActiveContent] = useState(0)

    console.log(store, 'store')

    const createKeyLocal = async () => {
        if (createKey) {
            await createKey(phrase, 'testpwd')
        }
    }

    let counter = 0
    useEffect(() => {
        console.log(phrase, 'phrase')
        if (phrase && counter == 0) {
            createKeyLocal()
            counter = 1
        }
    }, [phrase])

    useEffect(() => {
        if (publicKey && !account) {
            getCurrentAccount(publicKey)
        }
        // createKey()
        // addKey()
        // restoreKey()
    }, [publicKey])

    // var isPushEnabled = false
    //
    // window.addEventListener('load', function () {
    //     var pushButton = document.querySelector('.js-push-button')
    //     // @ts-ignore
    //     pushButton.addEventListener('click', function () {
    //         if (isPushEnabled) {
    //             // unsubscribe()
    //         } else {
    //             // subscribe()
    //         }
    //     })
    //
    //     // Check that service workers are supported, if so, progressively
    //     // enhance and add push messaging support, otherwise continue without it.
    //     if ('serviceWorker' in navigator) {
    //         navigator.serviceWorker.register('/service-worker.js').then(initialiseState)
    //     } else {
    //         console.warn("Service workers aren't supported in this browser.")
    //     }
    // })
    // // Once the service worker is registered set the initial state
    // function initialiseState() {
    //     // Are Notifications supported in the service worker?
    //     if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
    //         console.warn("Notifications aren't supported.")
    //         return
    //     }
    //
    //     // Check the current Notification permission.
    //     // If its denied, it's a permanent block until the
    //     // user changes the permission
    //     if (Notification.permission === 'denied') {
    //         console.warn('The user has blocked notifications.')
    //         return
    //     }
    //
    //     // Check if push messaging is supported
    //     if (!('PushManager' in window)) {
    //         console.warn("Push messaging isn't supported.")
    //         return
    //     }
    //
    //     // We need the service worker registration to check for a subscription
    //     navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
    //         // Do we already have a push message subscription?
    //         serviceWorkerRegistration.pushManager
    //             .getSubscription()
    //             .then(function (subscription) {
    //                 // Enable any UI which subscribes / unsubscribes from
    //                 // push messages.
    //                 var pushButton = document.querySelector('.js-push-button')
    //                 pushButton.disabled = false
    //
    //                 if (!subscription) {
    //                     // We aren't subscribed to push, so set UI
    //                     // to allow the user to enable push
    //                     return
    //                 }
    //
    //                 // Keep your server in sync with the latest subscriptionId
    //                 // sendSubscriptionToServer(subscription)
    //
    //                 // Set your UI to show they have subscribed for
    //                 // push messages
    //                 pushButton.textContent = 'Disable Push Messages'
    //                 isPushEnabled = true
    //             })
    //             .catch(function (err) {
    //                 console.warn('Error during getSubscription()', err)
    //             })
    //     })
    // }

    return (
        <>
            {/*<button className="js-push-button" disabled>*/}
            {/*    Enable Push Messages*/}
            {/*</button>*/}
            <AccountDetails parentStep={activeContent} account={account} />
            <UserAssets setActiveContent={setActiveContent} />
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
    publicKey: store.app.publicKey,
    phrase: store.app.phrase,
    account: store.app.account,
    store: store.app,
})

export default connect(mapStateToProps, {
    createKey,
    addKey,
    restoreKey,
    getCurrentAccount,
})(MainPageScreen)
