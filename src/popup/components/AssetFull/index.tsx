import React from 'react'
import { createRipple, removeRipple } from '@popup/common'
import * as nt from '@nekoton'

import TransactionsList from '@popup/components/TransactionsList'

import ReceiveIcon from '@popup/img/receive-dark-blue.svg'
import SendIcon from '@popup/img/send-dark-blue.svg'
import TonLogo from '@popup/img/ton-logo.svg'

import './style.scss'
import { convertTons } from '@shared/utils'

type IAssetFull = {
    handleSendReceive: (temp: string) => void // TODO: change
    onViewTransaction: (transaction: nt.Transaction) => void
    tonWalletState: nt.ContractState | null
}

const AssetFull: React.FC<IAssetFull> = ({
    handleSendReceive,
    onViewTransaction,
    tonWalletState,
}) => {
    return (
        <>
            <div className="asset-full">
                <div className="asset-full__top" />
                <div className="asset-full__info">
                    {/*// @ts-ignore*/}
                    <TonLogo style={{ marginRight: '16px', minWidth: '40px', zIndex: 1 }} />
                    <div className="asset-full__info-token">
                        <span className="asset-full__info-token-amount">{`${convertTons(
                            tonWalletState?.balance
                        ).toLocaleString()} TON`}</span>
                        <span className="asset-full__info-token-comment">FreeTon Crystal</span>
                    </div>
                </div>
                <div className="asset-full__buttons">
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
                </div>
                <div className="asset-full__history">
                    <h2 className="asset-full__history-title">History</h2>
                    <TransactionsList transactions={[]} onViewTransaction={onViewTransaction} />
                </div>
            </div>
        </>
    )
}

export default AssetFull
