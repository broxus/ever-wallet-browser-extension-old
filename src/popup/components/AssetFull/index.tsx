import React from 'react'
import { createRipple, removeRipple } from '@popup/common'
import * as nt from '@nekoton'

import TransactionsList from '@popup/components/TransactionsList'

import ReceiveIcon from '@popup/img/receive-dark-blue.svg'
import SendIcon from '@popup/img/send-dark-blue.svg'
import TonLogo from '@popup/img/ton-logo.svg'
import Ripples from 'react-ripples'

import './style.scss'
import { convertTons } from '@shared/utils'

type IAssetFull = {
    onViewTransaction: (transaction: nt.Transaction) => void
    tonWalletState: nt.ContractState | null
    transactions: nt.Transaction[]
    onSend: () => void
    onReceive: () => void
}

const AssetFull: React.FC<IAssetFull> = ({
    onViewTransaction,
    tonWalletState,
    transactions,
    onSend,
    onReceive,
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
                    <Ripples className="asset-full__buttons-wrapper">
                        <button onClick={() => onReceive()} className="asset-full__buttons-button">
                            <span className="asset-full__buttons-button__content">
                                {/*@ts-ignore*/}
                                <ReceiveIcon style={{ marginRight: '8px' }} />
                                Receive
                            </span>
                        </button>
                    </Ripples>

                    <Ripples className="asset-full__buttons-wrapper">
                        {/*TODO specify predefined token and "back" for Send panel*/}
                        <button onClick={() => onSend()} className="asset-full__buttons-button">
                            <span className="asset-full__buttons-button__content">
                                {/*@ts-ignore*/}
                                <SendIcon style={{ marginRight: '8px' }} />
                                Send
                            </span>
                        </button>
                    </Ripples>
                </div>
                <div className="asset-full__history">
                    <h2 className="asset-full__history-title">History</h2>
                    <TransactionsList
                        transactions={transactions}
                        onViewTransaction={onViewTransaction}
                    />
                </div>
            </div>
        </>
    )
}

export default AssetFull
