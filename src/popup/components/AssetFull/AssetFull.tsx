import React from 'react'
import { createRipple, removeRipple } from '../../common/ripple'
import ReceiveIcon from '../../img/receive-dark-blue.svg'
import SendIcon from '../../img/send-dark-blue.svg'
import Ripple from 'react-ripples'
import { TransactionsList } from '../../pages/MainPage/MainPageScreen'
import TonLogo from '../../img/ton-logo.svg'
import './asset-full.scss'

const AssetFull: React.FC<any> = ({ handleSendReceive }) => {
    return (
        <>
            <div className="asset-full">
                <div className="asset-full__top"></div>
                <div className="asset-full__info">
                    {/*// @ts-ignore*/}
                    <TonLogo style={{ marginRight: '16px', minWidth: '40px', zIndex: 1 }} />
                    <div className="asset-full__info-token">
                        <span className="asset-full__info-token-amount">204.00 TON</span>
                        <span className="asset-full__info-token-comment">FreeTon Crystal</span>
                    </div>
                </div>
                <div className="asset-full__buttons">
                    <Ripple className="wrapper">
                        <button
                            className="asset-full__buttons-button"
                            onMouseDown={createRipple}
                            onMouseLeave={removeRipple}
                            onMouseUp={(event) => {
                                removeRipple(event)
                                handleSendReceive && handleSendReceive('receive')
                            }}
                        >
                            <span className="asset-full__buttons-button__content">
                                {/*@ts-ignore*/}
                                <ReceiveIcon style={{ marginRight: '8px' }} />
                                Receive
                            </span>
                        </button>
                    </Ripple>

                    <Ripple className="wrapper">
                        <button
                            className="asset-full__buttons-button"
                            onMouseDown={createRipple}
                            onMouseLeave={removeRipple}
                            onMouseUp={(event) => {
                                removeRipple(event)
                                handleSendReceive && handleSendReceive('send')
                            }}
                        >
                            <span className="asset-full__buttons-button__content">
                                {/*@ts-ignore*/}
                                <SendIcon style={{ marginRight: '8px' }} />
                                Send
                            </span>
                        </button>
                    </Ripple>
                </div>
                <div className="asset-full__history">
                    <h2 className="asset-full__history-title">History</h2>
                    <TransactionsList />
                </div>
            </div>
        </>
    )
}

export default AssetFull
