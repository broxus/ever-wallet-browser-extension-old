import React, { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import UserPic from '../../img/user-avatar-placeholder.svg'
import UserPicS from '../../img/user-avatar-placeholder-s.svg'
import ReceiveIcon from '../../img/receive.svg'
import SendIcon from '../../img/send.svg'
import TonLogo from '../../img/ton-logo.svg'
import TonLogoS from '../../img/ton-logo-s.svg'
import USDTLogoS from '../../img/usdt-logo-s.svg'
import Plus from '../../img/plus.svg'
import Arrow from '../../img/arrow.svg'
import { Button } from '../../components/button'
import { createRipple, removeRipple } from '../../common/ripple'
import SlidingPanel from '../../components/SlidingPanel/SlidingPanel'
import Send from '../../components/Send/Send'
import Receive from '../../components/Receive/Receive'
import AddNewToken from '../../components/AddNewToken/AddNewToken'
import { connect } from 'react-redux'
import { AppState } from '../../store/app/types'
import { addKey, createKey, restoreKey } from '../../store/app/actions'
import KeyStorage from '../../components/KeyStorage/KeyStorage'
import CreateAccountScreen from '../CreateAccount/CreateAccountScreen'
import './main-page.scss'
import EnterPassword from '../../components/EnterPassword/EnterPassword'
import SaveSeed from '../../components/SaveSeed/SaveSeed'

const AccountModal: React.FC<any> = ({ setActiveContent, setPanelVisible, setModalVisible }) => {
    const hideModalOnClick = (ref: React.MutableRefObject<null>) => {
        const handleClickOutside = (event: { target: any }) => {
            // @ts-ignore
            if (ref.current && !ref.current.contains(event.target)) {
                setModalVisible(false)
            }
        }
        useEffect(() => {
            document.addEventListener('mousedown', handleClickOutside)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        })
    }

    const Wrapper = (props: any) => {
        const wrapperRef = useRef(null)
        hideModalOnClick(wrapperRef)
        return (
            <div ref={wrapperRef} className="main-page__account-settings noselect">
                {props.children}
            </div>
        )
    }

    const navigate = (step: number) => {
        setPanelVisible(true)
        setModalVisible(false)
        setActiveContent(step)
    }

    return (
        <Wrapper>
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    style={{ display: 'flex' }}
                >
                    <UserPicS />
                    <div style={{ padding: '0 12px' }}>
                        <div className="main-page__account-settings-section-account">Account 1</div>
                        <div className="main-page__account-settings-section-item-value">
                            $1,200.00
                        </div>
                        <div>Connected sites</div>
                    </div>
                </div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    style={{ display: 'flex' }}
                    onClick={() => navigate(3)}
                >
                    <Plus />
                    <div style={{ padding: '0 12px' }}>Create account</div>
                </div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    onClick={() => navigate(2)}
                >
                    Key storage
                </div>
                <div className="main-page__account-settings-section-item">Wallet settings</div>
                <div className="main-page__account-settings-section-item">Information and help</div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div className="main-page__account-settings-section-item-log-out">Log out</div>
        </Wrapper>
    )
}

const AccountDetails = () => {
    const [modalVisible, setModalVisible] = useState(false)
    const [panelVisible, setPanelVisible] = useState(false)
    const [activeContent, setActiveContent] = useState(0)

    // TODO temp hack, remove later
    const [step, setStep] = useState(0)
    useEffect(() => {
        setActiveContent(5)
    }, [step])

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
                    <span className="main-page__account-details-acc-address">0:B5d3...cDdB</span>
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

const Assets = () => {
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
            <div>
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

const UserAssets = () => {
    const [activeTab, setActiveTab] = useState(0)
    const content = [<Assets />, <Transactions />]

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
    locale: any
}
const MainPageScreen: React.FC<IMainPageScreen> = ({ locale }) => {
    console.log(locale, 'locale')

    useEffect(() => {
        // createKey()
        // addKey()
        // restoreKey()
    }, [])

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
        <div>
            {/*<button className="js-push-button" disabled>*/}
            {/*    Enable Push Messages*/}
            {/*</button>*/}
            <AccountDetails />
            <UserAssets />
        </div>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    locale: store.app.locale,
    seed: store.app.seed,
    key: store.app.key,
    publicKey: store.app.publicKey,
})

export default connect(mapStateToProps, {
    createKey,
    addKey,
    restoreKey,
})(MainPageScreen)
