import React, { useState } from 'react'
import UserPic from '../../img/user-avatar-placeholder.svg'
import Receive from '../../img/receive.svg'
import Send from '../../img/send.svg'
import TonLogo from '../../img/ton-logo.svg'
import TonLogoS from '../../img/ton-logo-s.svg'
import Arrow from '../../img/arrow.svg'

import './main-page.scss'
import { Button } from '../../components/button'
import { createRipple, removeRipple } from '../../common/ripple'
import cn from 'classnames'

const AccountDetails = () => {
    const handleClick = () => {
        console.log('clicked')
    }

    return (
        <div className="main-page__account-details">
            <div className="main-page__account-details-top-panel">
                <div className="main-page__account-details-network">Free TON main net</div>
                <UserPic />
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
                        handleClick && handleClick()
                    }}
                >
                    <div className="main-page__account-details-button__content">
                        {/*@ts-ignore*/}
                        <Receive style={{ marginRight: '8px' }} />
                        Receive
                    </div>
                </button>

                <button
                    className="main-page__account-details-button _blue"
                    onMouseDown={createRipple}
                    onMouseLeave={removeRipple}
                    onMouseUp={(event) => {
                        removeRipple(event)
                        handleClick && handleClick()
                    }}
                >
                    <div className="main-page__account-details-button__content">
                        {/*@ts-ignore*/}
                        <Send style={{ marginRight: '8px' }} />
                        Send
                    </div>
                </button>
            </div>
        </div>
    )
}

const Asset = () => (
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

const Assets = () => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
        }}
    >
        <div style={{ overflowY: 'scroll', maxHeight: '260px' }}>
            <Asset />
            <Asset />
            <Asset />
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
        ></div>
        <div style={{ width: '148px', position: 'absolute', bottom: '0', left: '85px' }}>
            <Button text={'Add new asset'} white />
        </div>
    </div>
)

const Transaction = () => {
    return (
        <div className="main-page__user-assets-asset">
            <div style={{ display: 'flex', width: '100%' }}>
                {/*// @ts-ignore*/}
                <TonLogoS style={{ marginRight: '16px' }} />
                <div className="main-page__user-assets-asset-number">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="main-page__user-assets-asset-number-amount">
                            0xa55d...0D8D
                        </span>
                        <span className="main-page__user-assets-asset-number-dollars">
                            + 204.00 TON
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="main-page__user-assets-asset-number-dollars">14:56</span>
                        <span className="main-page__user-assets-asset-number-dollars">
                            Fees: 0.00034 TON
                        </span>
                    </div>
                    <span className="main-page__user-assets-asset-number-dollars">
                        Staking reward.
                    </span>
                </div>
            </div>
        </div>
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
        ></div>
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

const MainPageScreen = () => (
    <>
        <AccountDetails />
        <UserAssets />
    </>
)

export default MainPageScreen
