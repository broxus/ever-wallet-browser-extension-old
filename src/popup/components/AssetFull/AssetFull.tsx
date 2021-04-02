import React from 'react'
import './asset-full.scss'
import { createRipple, removeRipple } from '../../common/ripple'
import ReceiveIcon from '../../img/receive.svg'
import SendIcon from '../../img/send.svg'

const AssetFull = () => {
    const handleReceiveClick = () => {}

    const handleSendClick = () => {}
    return (
        <>
            <div className="main-page__account-details">
                <div className="main-page__account-details-buttons">
                    <button
                        className="asset__buttons-button"
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
                        className="asset__buttons-button"
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

export default AssetFull
