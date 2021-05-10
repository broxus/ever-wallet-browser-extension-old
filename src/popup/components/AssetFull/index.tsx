import React, { useState } from 'react'
import { createRipple, removeRipple } from '@popup/common'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { convertTons, SelectedAsset } from '@shared/utils'
import * as nt from '@nekoton'

import Ripples from 'react-ripples'
import TransactionsList from '@popup/components/TransactionsList'
import Receive from '@popup/components/Receive'
import Send from '@popup/components/Send'
import DeployWallet from '@popup/components/DeployWallet/DeployWallet'
import KeyStorage from '@popup/components/KeyStorage'
import CreateAccountPage from '@popup/pages/CreateAccountPage'
import TransactionInfo from '@popup/components/TransactionInfo'
import SlidingPanel from '@popup/components/SlidingPanel'

import ReceiveIcon from '@popup/img/receive-dark-blue.svg'
import SendIcon from '@popup/img/send-dark-blue.svg'
import TonLogo from '@popup/img/ton-logo.svg'

import './style.scss'

type IAssetFull = {
    selectedAsset: SelectedAsset
    controllerState: ControllerState
    controllerRpc: IControllerRpcClient
}

enum Panel {
    RECEIVE,
    SEND,
    DEPLOY,
    TRANSACTION,
}

const AssetFull: React.FC<IAssetFull> = ({}) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()
    const [selectedTransaction, setSelectedTransaction] = useState<nt.Transaction>()

    const closePanel = () => {
        setSelectedTransaction(undefined)
        setOpenedPanel(undefined)
    }

    const showTransaction = (transaction: nt.Transaction) => {
        setSelectedTransaction(transaction)
        setOpenedPanel(Panel.TRANSACTION)
    }

    const onReceive = () => {
        // TODO
    }

    const onSend = () => {
        // TODO
    }

    return (
        <>
            <div className="asset-full">
                <div className="asset-full__top" />
                <div className="asset-full__info">
                    {/*// @ts-ignore*/}
                    <TonLogo style={{ marginRight: '16px', minWidth: '40px', zIndex: 1 }} />
                    <div className="asset-full__info-token">
                        <span className="asset-full__info-token-amount">{`${convertTons(
                            '0'
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
                    <TransactionsList transactions={[]} onViewTransaction={showTransaction} />
                </div>
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <>
                    {openedPanel == Panel.TRANSACTION && selectedTransaction && (
                        <TransactionInfo transaction={selectedTransaction} />
                    )}
                </>
            </SlidingPanel>
        </>
    )
}

export default AssetFull
