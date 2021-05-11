import React, { useState } from 'react'
import { createRipple, removeRipple } from '@popup/common'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { convertCurrency, SelectedAsset, TokenWalletState } from '@shared/utils'
import * as nt from '@nekoton'

import TransactionsList from '@popup/components/TransactionsList'
import Receive from '@popup/components/Receive'
import Send from '@popup/components/Send'
import DeployWallet from '@popup/components/DeployWallet/DeployWallet'
import TransactionInfo from '@popup/components/TransactionInfo'
import SlidingPanel from '@popup/components/SlidingPanel'
import AssetIcon from '@popup/components/AssetIcon'

import ReceiveIcon from '@popup/img/receive-dark-blue.svg'
import SendIcon from '@popup/img/send-dark-blue.svg'
import DeployIcon from '@popup/img/deploy-dark-blue.svg'

import './style.scss'

type IAssetFull = {
    account: nt.AssetsList
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    selectedKey: nt.KeyStoreEntry
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

const AssetFull: React.FC<IAssetFull> = ({
    account,
    tokenWalletStates,
    selectedAsset,
    selectedKey,
    controllerState,
    controllerRpc,
}) => {
    const [openedPanel, setOpenedPanel] = useState<Panel>()
    const [selectedTransaction, setSelectedTransaction] = useState<nt.Transaction>()

    const { knownTokens } = controllerState

    const accountName = account.name
    const accountAddress = account.tonWallet.address
    let tonWalletState = controllerState.accountContractStates[accountAddress] as
        | nt.ContractState
        | undefined

    let shouldDeploy: boolean
    let balance: string | undefined
    let transactions: nt.Transaction[] | undefined
    let symbol: nt.Symbol | undefined
    let currencyName: string | undefined
    let decimals: number | undefined

    if (selectedAsset.type == 'ton_wallet') {
        shouldDeploy =
            tonWalletState == null ||
            (!tonWalletState.isDeployed &&
                nt.getContractTypeDetails(account.tonWallet.contractType).requiresSeparateDeploy)
        balance = tonWalletState?.balance
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

        symbol = controllerState.knownTokens[rootTokenContract]
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
        setOpenedPanel(Panel.SEND)
    }

    const onDeploy = () => {
        setOpenedPanel(Panel.DEPLOY)
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

                    {tonWalletState && (balance || '0') != '0' && (
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
                    )}
                </div>

                <div className="asset-full__history">
                    <TransactionsList
                        symbol={symbol}
                        transactions={transactions || []}
                        onViewTransaction={showTransaction}
                    />
                </div>
            </div>
            <SlidingPanel isOpen={openedPanel != null} onClose={closePanel}>
                <>
                    {openedPanel == Panel.RECEIVE && (
                        <Receive
                            accountName={accountName}
                            address={accountAddress}
                            currencyName={currencyName}
                        />
                    )}
                    {openedPanel == Panel.SEND && tonWalletState && (
                        <Send
                            account={account}
                            defaultAsset={selectedAsset}
                            keyEntry={selectedKey}
                            tonWalletState={tonWalletState}
                            tokenWalletStates={tokenWalletStates}
                            knownTokens={knownTokens}
                            onBack={closePanel}
                            estimateFees={async (params) =>
                                await controllerRpc.estimateFees(accountAddress, params)
                            }
                            prepareMessage={async (params, password) =>
                                controllerRpc.prepareMessage(accountAddress, params, password)
                            }
                            prepareTokenMessage={async (owner, rootTokenContract, params) =>
                                controllerRpc.prepareTokenMessage(owner, rootTokenContract, params)
                            }
                            prepareSwapBackMessage={async (owner, rootTokenContract, params) =>
                                controllerRpc.prepareSwapBackMessage(
                                    owner,
                                    rootTokenContract,
                                    params
                                )
                            }
                            sendMessage={async (message) =>
                                controllerRpc.sendMessage(accountAddress, message)
                            }
                        />
                    )}
                    {openedPanel == Panel.DEPLOY && (
                        <DeployWallet
                            account={account}
                            keyEntry={selectedKey}
                            tonWalletState={tonWalletState}
                            onBack={closePanel}
                            estimateFees={async () =>
                                controllerRpc.estimateDeploymentFees(accountAddress)
                            }
                            prepareDeployMessage={async (password) =>
                                controllerRpc.prepareDeploymentMessage(accountAddress, password)
                            }
                            sendMessage={async (message) =>
                                controllerRpc.sendMessage(accountAddress, message)
                            }
                        />
                    )}
                    {openedPanel == Panel.TRANSACTION && selectedTransaction && (
                        <TransactionInfo symbol={symbol} transaction={selectedTransaction} />
                    )}
                </>
            </SlidingPanel>
        </>
    )
}

export default AssetFull
