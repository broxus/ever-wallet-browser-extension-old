import React, { useState } from 'react'
import { createRipple, removeRipple } from '@popup/common'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { convertTons, convertCurrency, SelectedAsset } from '@shared/utils'
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
import AssetIcon from '@popup/components/AssetIcon'

import ReceiveIcon from '@popup/img/receive-dark-blue.svg'
import SendIcon from '@popup/img/send-dark-blue.svg'
import DeployIcon from '@popup/img/deploy-dark-blue.svg'

import './style.scss'

type IAssetFull = {
    account: nt.AssetsList
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

const AssetFull: React.FC<IAssetFull> = ({ account, selectedAsset, controllerState }) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()
    const [selectedTransaction, setSelectedTransaction] = useState<nt.Transaction>()

    const accountName = account.name
    const accountAddress = account.tonWallet.address

    let shouldDeploy: boolean
    let balance: string | undefined
    let transactions: nt.Transaction[] | undefined
    let currencyName: string | undefined
    let decimals: number | undefined

    if (selectedAsset.type == 'ton_wallet') {
        const contractState = controllerState.accountContractStates[accountAddress]
        shouldDeploy =
            contractState == null ||
            (!contractState.isDeployed &&
                nt.getContractTypeDetails(account.tonWallet.contractType).requiresSeparateDeploy)
        balance = contractState?.balance
        transactions = controllerState.accountTransactions[accountAddress]
        currencyName = 'TON'
        decimals = 9
    } else {
        const rootTokenContract = selectedAsset.data.rootTokenContract

        shouldDeploy = false
        balance = controllerState.accountTokenStates[accountAddress]?.[rootTokenContract]?.balance
        transactions =
            controllerState.accountTokenTransactions[accountAddress]?.[
                selectedAsset.data.rootTokenContract
            ]

        const symbol = controllerState.knownTokens[rootTokenContract]
        currencyName = symbol.name
        decimals = symbol.decimals
    }

    const closePanel = () => {
        setSelectedTransaction(undefined)
        setOpenedPanel(undefined)
    }

    const showTransaction = (transaction: nt.Transaction) => {
        setSelectedTransaction(transaction)
        setOpenedPanel(Panel.TRANSACTION)
    }

    const onReceive = () => {
        setOpenedPanel(Panel.RECEIVE)
    }

    const onSend = () => {
        // TODO
    }

    const onDeploy = () => {
        // TODO
    }

    return (
        <>
            <div className="asset-full">
                <div className="asset-full__top" />
                <div className="asset-full__info">
                    <AssetIcon
                        type={selectedAsset.type}
                        address={
                            selectedAsset.type == 'ton_wallet'
                                ? selectedAsset.data.address
                                : selectedAsset.data.rootTokenContract
                        }
                        className="asset-full__info__icon"
                    />
                    <div className="asset-full__info-token">
                        <span className="asset-full__info-token-amount">
                            {decimals != null && convertCurrency(balance || '0', decimals)}
                        </span>
                        <span className="asset-full__info-token-comment">{currencyName}</span>
                    </div>
                </div>

                <div className="asset-full__controls noselect">
                    <button
                        className="asset-full__controls__button"
                        onClick={() => {}}
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            onReceive()
                        }}
                    >
                        <div className="asset-full__controls__button__content">
                            {/*@ts-ignore*/}
                            <ReceiveIcon style={{ marginRight: '8px' }} />
                            Receive
                        </div>
                    </button>

                    <button
                        className="asset-full__controls__button"
                        onClick={() => {}}
                        onMouseDown={createRipple}
                        onMouseLeave={removeRipple}
                        onMouseUp={(event) => {
                            removeRipple(event)
                            if (shouldDeploy) {
                                onDeploy()
                            } else {
                                onSend()
                            }
                        }}
                    >
                        <div className="asset-full__controls__button__content">
                            {shouldDeploy ? (
                                <>
                                    {/*@ts-ignore*/}
                                    <DeployIcon style={{ marginRight: '8px' }} />
                                    Deploy
                                </>
                            ) : (
                                <>
                                    {/*@ts-ignore*/}
                                    <SendIcon style={{ marginRight: '8px' }} />
                                    Send
                                </>
                            )}
                        </div>
                    </button>
                </div>

                <div className="asset-full__history">
                    <h2 className="asset-full__history-title">History</h2>
                    <TransactionsList
                        transactions={transactions || []}
                        onViewTransaction={showTransaction}
                    />
                </div>
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <>
                    {openedPanel == Panel.RECEIVE && (
                        <Receive accountName={accountName} address={accountAddress} />
                    )}
                    {openedPanel == Panel.TRANSACTION && selectedTransaction && (
                        <TransactionInfo transaction={selectedTransaction} />
                    )}
                </>
            </SlidingPanel>
        </>
    )
}

export default AssetFull
