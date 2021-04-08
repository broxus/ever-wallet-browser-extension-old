import React from 'react'
import { createRipple, removeRipple } from '../../common/ripple'
import ReceiveIcon from '../../img/receive-dark-blue.svg'
import SendIcon from '../../img/send-dark-blue.svg'
import './asset-full.scss'

const AssetFull = () => {
    const handleReceiveClick = () => {}

    const handleSendClick = () => {}
    return (
        <>
            <div className="asset-full">
                <div className="asset-full__buttons">
                    <button
                        className="asset-full__buttons-button"
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            handleReceiveClick && handleReceiveClick()
                        }}
                    >
                        <span className="asset-full__buttons-button__content">
                            {/*@ts-ignore*/}
                            <ReceiveIcon style={{ marginRight: '8px' }} />
                            Receive
                        </span>
                    </button>

                    <button
                        className="asset-full__buttons-button"
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            handleSendClick && handleSendClick()
                        }}
                    >
                        <span className="asset-full__buttons-button__content">
                            {/*@ts-ignore*/}
                            <SendIcon style={{ marginRight: '8px' }} />
                            Send
                        </span>
                    </button>
                </div>
            </div>
        </>
    )
}

export default AssetFull
