import * as React from 'react'

import * as nt from '@nekoton'
import {
    convertCurrency,
    extractTokenTransactionAddress,
    extractTransactionAddress,
    trimTokenName,
} from '@shared/utils'

import Button from '@popup/components/Button'
import { CopyText } from '@popup/components/CopyText'
import { EnterPassword } from '@popup/components/Send/components'
import { useSelectableKeys } from '@popup/hooks/useSelectableKeys'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { ConfirmMessageToPrepare } from '@shared/backgroundApi'

import './style.scss'

type Props = {
    symbol?: nt.Symbol
    transaction: nt.TonWalletTransaction | nt.TokenWalletTransaction
}

enum LocalStep {
    PREVIEW,
    ENTER_PASSWORD,
}

const TRANSACTION_NAMES = {
    to: 'Recipient',
    service: 'Recipient',
    from: 'Sender',
    incoming_transfer: 'Sender',
    outgoing_transfer: 'Recipient',
    swap_back: 'Recipient',
}

export function MultisigTransactionSign({ transaction, symbol }: Props): JSX.Element | null {
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()
    const { keys } = useSelectableKeys()

    if (
        transaction.info?.type !== 'wallet_interaction' ||
        transaction.info.data.method.type !== 'multisig' ||
        transaction.info.data.method.data.type !== 'submit' ||
        transaction.info.data.method.data.data.transactionId === '0'
    ) {
        return null
    }

    const [inProcess, setInProcess] = React.useState(false)
    const [step, setStep] = React.useState(LocalStep.PREVIEW)

    const source = transaction.inMessage.dst!
    const value = React.useMemo(() => {
        return transaction.info?.data.method.data.data.value
    }, [symbol, transaction])

    let direction: string | undefined, address: string | undefined

    if (symbol == null) {
        const txAddress = extractTransactionAddress(transaction)
        direction = TRANSACTION_NAMES[txAddress.direction]
        address = txAddress.address
    } else {
        const tokenTransaction = transaction as nt.TokenWalletTransaction
        const txAddress = extractTokenTransactionAddress(tokenTransaction)
        if (txAddress && tokenTransaction.info) {
            direction = (TRANSACTION_NAMES as any)[tokenTransaction.info.type]
            address = txAddress?.address
        }
    }

    const decimals = symbol == null ? 9 : symbol.decimals
    const currencyName = symbol == null ? 'TON' : symbol.name
    const transactionId = transaction.info?.data.method.data.data.transactionId as string
    const creator = transaction.info.data.method.data.data.custodian

    const { unconfirmedTransaction, multisigTransaction } = React.useMemo(() => {
        return source !== undefined
            ? {
                  unconfirmedTransaction:
                      rpcState.state.accountUnconfirmedTransactions[source]?.[transactionId],
                  multisigTransaction:
                      rpcState.state.accountMultisigTransactions[source]?.[transactionId],
              }
            : {}
    }, [source, transactionId, rpcState.state.accountMultisigTransactions])

    const confirmations: string[] = multisigTransaction?.confirmations || []

    const custodians = rpcState.state.accountCustodians[source] || []
    const filteredSelectableKeys = React.useMemo(
        () => keys.filter((key) => !confirmations.includes(key.publicKey)),
        [confirmations, keys]
    )
    const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry | undefined>(
        filteredSelectableKeys[0]
    )

    const txHash = multisigTransaction?.finalTransactionHash

    const onConfirm = () => {
        setStep(LocalStep.ENTER_PASSWORD)
    }

    const onBack = () => {
        setStep(LocalStep.PREVIEW)
    }

    const onSubmit = async (keyPassword: nt.KeyPassword) => {
        let messageToPrepare: ConfirmMessageToPrepare = {
            publicKey: keyPassword.data.publicKey,
            transactionId: transactionId,
        }

        if (transaction.inMessage.dst === undefined) return

        setInProcess(true)

        const signedMessage = await rpc.prepareConfirmMessage(
            transaction.inMessage.dst,
            messageToPrepare,
            keyPassword
        )

        try {
            rpc.sendMessage(transaction.inMessage.dst, {
                signedMessage,
                info: {
                    type: 'confirm',
                    data: undefined,
                },
            })
            drawer.setPanel(undefined)
        } catch (e) {}
    }

    if (step === LocalStep.ENTER_PASSWORD) {
        return (
            <div className="multisig-transaction">
                <header className="multisig-transaction__header">
                    <h2 className="multisig-transaction__header-title noselect">Confirm message</h2>
                </header>

                {selectedKey != null && (
                    <EnterPassword
                        showHeading={false}
                        currencyName={currencyName}
                        disabled={inProcess}
                        transactionId={transactionId}
                        keyEntries={filteredSelectableKeys}
                        keyEntry={selectedKey}
                        params={{
                            recipient: address as string,
                            amount: convertCurrency(value.toString(), decimals),
                        }}
                        onChangeKeyEntry={setKey}
                        onSubmit={onSubmit}
                        onBack={onBack}
                    />
                )}
            </div>
        )
    }

    return (
        <div className="multisig-transaction">
            <header className="multisig-transaction__header">
                <h2 className="multisig-transaction__header-title noselect">
                    Multisig transaction
                </h2>
            </header>

            <div className="multisig-transaction__wrapper">
                <div className="transaction-info-tx-details">
                    <div className="transaction-info-tx-details-param">
                        <span className="transaction-info-tx-details-param-desc">
                            Date and time
                        </span>
                        <span className="transaction-info-tx-details-param-value">
                            {new Date(transaction.createdAt * 1000).toLocaleString()}
                        </span>
                    </div>

                    {txHash != undefined && (
                        <div className="transaction-info-tx-details-param">
                            <span className="transaction-info-tx-details-param-desc">
                                Hash (ID)
                            </span>
                            <CopyText
                                className="transaction-info-tx-details-param-value copy"
                                id={`copy-${txHash}`}
                                text={txHash}
                            />
                        </div>
                    )}

                    {address !== undefined && (
                        <div className="transaction-info-tx-details-param">
                            <span className="transaction-info-tx-details-param-desc">
                                {direction}
                            </span>
                            <CopyText
                                className="transaction-info-tx-details-param-value copy"
                                id={`copy-${address}`}
                                text={address}
                            />
                        </div>
                    )}

                    {transactionId !== undefined && (
                        <div className="transaction-info-tx-details-param">
                            <span className="transaction-info-tx-details-param-desc">
                                Transaction Id
                            </span>
                            <span className="transaction-info-tx-details-param-value">
                                {transactionId}
                            </span>
                        </div>
                    )}

                    <div className="transaction-info-tx-details-separator" />
                    <div className="transaction-info-tx-details-param">
                        <span className="transaction-info-tx-details-param-desc">Amount</span>
                        <span className="transaction-info-tx-details-param-value">
                            {convertCurrency(value.toString(), decimals)}{' '}
                            {currencyName.length >= 10 ? trimTokenName(currencyName) : currencyName}
                        </span>
                    </div>

                    {custodians.length > 1 && (
                        <>
                            <div className="transaction-info-tx-details-separator" />

                            {unconfirmedTransaction != null ? (
                                <div className="transaction-info-tx-details-param">
                                    <span className="transaction-info-tx-details-param-desc">
                                        Signatures
                                    </span>
                                    <span className="transaction-info-tx-details-param-value">
                                        {confirmations.length} of{' '}
                                        {unconfirmedTransaction.signsRequired} signatures collected
                                    </span>
                                </div>
                            ) : (
                                <div className="transaction-info-tx-details-param">
                                    <span className="transaction-info-tx-details-param-desc">
                                        Status
                                    </span>
                                    <span className="transaction-info-tx-details-param-value">
                                        {txHash != null ? 'Sent' : 'Expired'}
                                    </span>
                                </div>
                            )}

                            {custodians.map((custodian, idx) => {
                                const isSigned = confirmations.includes(custodian)
                                const isInitiator = creator === custodian

                                return (
                                    <div
                                        key={custodian}
                                        className="transaction-info-tx-details-param"
                                    >
                                        <div className="transaction-info-tx-details-param-desc">
                                            Custodian {idx + 1}
                                            {isSigned && (
                                                <span className="transaction-info-tx-details-param-signed">
                                                    Signed
                                                </span>
                                            )}
                                            {isInitiator && (
                                                <span className="transaction-info-tx-details-param-initiator">
                                                    Initiator
                                                </span>
                                            )}
                                            {!isSigned && (
                                                <span className="transaction-info-tx-details-param-unsigned">
                                                    Not signed
                                                </span>
                                            )}
                                        </div>
                                        <CopyText
                                            className="transaction-info-tx-details-param-value copy"
                                            id={`copy-${custodian}`}
                                            text={custodian}
                                        />
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>

                {txHash != null ? (
                    <footer className="multisig-transaction__footer">
                        <Button
                            white
                            onClick={() => {
                                chrome.tabs.create({
                                    url: `https://ton-explorer.com/transactions/${txHash}`,
                                    active: false,
                                })
                            }}
                            text="Open in explorer"
                        />
                    </footer>
                ) : unconfirmedTransaction != null ? (
                    <footer className="multisig-transaction__footer">
                        <Button text="Confirm" onClick={onConfirm} disabled={selectedKey == null} />
                    </footer>
                ) : (
                    <></>
                )}
            </div>
        </div>
    )
}
