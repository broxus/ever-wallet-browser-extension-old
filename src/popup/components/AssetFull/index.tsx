import * as React from 'react'
import { useIntl } from 'react-intl'
import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'
import { requiresSeparateDeploy } from '@shared/contracts'
import { createRipple, removeRipple } from '@popup/common'
import { DeployWallet } from '@popup/components/DeployWallet'
import { TransactionsList } from '@popup/components/TransactionsList'
import Receive from '@popup/components/Receive'
import { Send } from '@popup/components/Send'
import { TransactionInfo } from '@popup/components/TransactionInfo'
import SlidingPanel from '@popup/components/SlidingPanel'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { MultisigTransactionSign } from '@popup/components/MultisigTransaction'
import { getScrollWidth } from '@popup/utils/getScrollWidth'
import {
    convertCurrency,
    isSubmitTransaction,
    SelectedAsset,
    TokenWalletState,
} from '@shared/utils'

import AssetIcon from '@popup/components/AssetIcon'
import ReceiveIcon from '@popup/img/receive-dark-blue.svg'
import SendIcon from '@popup/img/send-dark-blue.svg'
import DeployIcon from '@popup/img/deploy-dark-blue.svg'

import './style.scss'

type Props = {
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    selectedKeys: nt.KeyStoreEntry[]
    selectedAsset: SelectedAsset
}

enum Panel {
    RECEIVE,
    SEND,
    DEPLOY,
    TRANSACTION,
}

export function AssetFull({ tokenWalletStates, selectedAsset, selectedKeys }: Props) {
    const intl = useIntl()
    const accountability = useAccountability()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const account = accountability.selectedAccount

    if (account == null) {
        return null
    }

    const [openedPanel, setOpenedPanel] = React.useState<Panel>()
    const [selectedTransaction, setSelectedTransaction] = React.useState<nt.Transaction>()
    const scrollArea = React.useRef<HTMLDivElement>(null)

    const accountName = account.name
    const accountAddress = account.tonWallet.address
    const tonWalletAsset = account.tonWallet
    const tonWalletState = rpcState.state.accountContractStates[accountAddress] as
        | nt.ContractState
        | undefined
    const tokenWalletAssets =
        account.additionalAssets[rpcState.state.selectedConnection.group]?.tokenWallets || []

    const scrollWidth = React.useMemo(() => getScrollWidth(), [])
    const shouldDeploy = React.useMemo(() => {
        if (selectedAsset.type == 'ton_wallet') {
            return (
                tonWalletState == null ||
                (!tonWalletState.isDeployed &&
                    requiresSeparateDeploy(account.tonWallet.contractType))
            )
        }
        return false
    }, [selectedAsset, tonWalletState])
    const balance = React.useMemo(() => {
        if (selectedAsset.type == 'ton_wallet') {
            return tonWalletState?.balance
        }
        const rootTokenContract = selectedAsset.data.rootTokenContract
        return rpcState.state.accountTokenStates[accountAddress]?.[rootTokenContract]?.balance
    }, [selectedAsset, rpcState.state.accountTokenStates, tonWalletState])
    const transactions = React.useMemo(() => {
        if (selectedAsset.type == 'ton_wallet') {
            return rpcState.state.accountTransactions[accountAddress] || []
        }
        const tokenTransactions =
            rpcState.state.accountTokenTransactions[accountAddress]?.[
                selectedAsset.data.rootTokenContract
            ]
        return (
            tokenTransactions?.filter((transaction) => {
                const tokenTransaction = transaction as nt.TokenWalletTransaction
                return tokenTransaction.info != null
            }) || []
        )
    }, [selectedAsset, rpcState.state.accountTransactions, rpcState.state.accountTokenTransactions])
    const symbol = React.useMemo(() => {
        if (selectedAsset.type == 'ton_wallet') {
            return undefined
        }
        const rootTokenContract = selectedAsset.data.rootTokenContract
        return rpcState.state.knownTokens[rootTokenContract]
    }, [])

    const currencyName = selectedAsset.type === 'ton_wallet' ? NATIVE_CURRENCY : symbol?.name
    const decimals = selectedAsset.type === 'ton_wallet' ? 9 : symbol?.decimals
    const old = selectedAsset.type === 'token_wallet' && symbol?.version != 'Tip3'

    const preloadTransactions = React.useCallback(
        ({ lt }) => {
            if (selectedAsset.type === 'ton_wallet') {
                return rpc.preloadTransactions(accountAddress, lt)
            }
            const rootTokenContract = selectedAsset.data.rootTokenContract
            return rpc.preloadTokenTransactions(accountAddress, rootTokenContract, lt)
        },
        [accountAddress, selectedAsset]
    )

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

    const onSend = async () => {
        await rpc.tempStorageInsert('selected_asset', selectedAsset)
        await rpc.openExtensionInExternalWindow({
            group: 'send',
            width: 360 + scrollWidth - 1,
            height: 600 + scrollWidth - 1,
        })
        setOpenedPanel(undefined)
    }

    const onDeploy = () => {
        setOpenedPanel(Panel.DEPLOY)
    }

    React.useEffect(() => {
        const transactionToUpdate = (
            transactions as (nt.TonWalletTransaction | nt.TokenWalletTransaction)[]
        ).find((transaction) => {
            return transaction.id === selectedTransaction?.id
        })
        if (transactionToUpdate !== undefined) {
            setSelectedTransaction(transactionToUpdate)
        }
    }, [transactions])

    const showSendButton =
        tonWalletState &&
        (balance || '0') != '0' &&
        (selectedAsset.type === 'ton_wallet' ||
            tonWalletState.isDeployed ||
            !requiresSeparateDeploy(account.tonWallet.contractType))

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
                        old={old}
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
                            <img src={ReceiveIcon} alt="" style={{ marginRight: '8px' }} />
                            {intl.formatMessage({ id: 'RECEIVE_BTN_TEXT' })}
                        </div>
                    </button>

                    {showSendButton && (
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
                                        <img
                                            src={DeployIcon}
                                            alt=""
                                            style={{ marginRight: '8px' }}
                                        />
                                        {intl.formatMessage({ id: 'DEPLOY_BTN_TEXT' })}
                                    </>
                                ) : (
                                    <>
                                        <img src={SendIcon} alt="" style={{ marginRight: '8px' }} />
                                        {intl.formatMessage({ id: 'SEND_BTN_TEXT' })}
                                    </>
                                )}
                            </div>
                        </button>
                    )}
                </div>

                <div className="asset-full__history" ref={scrollArea}>
                    <TransactionsList
                        tonWalletAsset={tonWalletAsset}
                        topOffset={0}
                        fullHeight={380}
                        scrollArea={scrollArea}
                        symbol={symbol}
                        transactions={transactions}
                        onViewTransaction={showTransaction}
                        preloadTransactions={preloadTransactions}
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
                            accountName={accountName}
                            tonWalletAsset={tonWalletAsset}
                            tokenWalletAssets={tokenWalletAssets}
                            defaultAsset={selectedAsset}
                            keyEntries={selectedKeys}
                            tonWalletState={tonWalletState}
                            tokenWalletStates={tokenWalletStates}
                            knownTokens={rpcState.state.knownTokens}
                            onBack={closePanel}
                            estimateFees={async (params) =>
                                await rpc.estimateFees(accountAddress, params, {})
                            }
                            prepareMessage={async (params, password) =>
                                rpc.prepareTransferMessage(accountAddress, params, password)
                            }
                            prepareTokenMessage={async (owner, rootTokenContract, params) =>
                                rpc.prepareTokenMessage(owner, rootTokenContract, params)
                            }
                            sendMessage={async (message) =>
                                rpc.sendMessage(accountAddress, message)
                            }
                        />
                    )}
                    {openedPanel == Panel.DEPLOY && <DeployWallet />}
                    {openedPanel == Panel.TRANSACTION &&
                        selectedTransaction &&
                        (isSubmitTransaction(selectedTransaction) ? (
                            <MultisigTransactionSign transaction={selectedTransaction} />
                        ) : (
                            <TransactionInfo transaction={selectedTransaction} symbol={symbol} />
                        ))}
                </>
            </SlidingPanel>
        </>
    )
}
