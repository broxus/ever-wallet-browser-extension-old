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
    const selectableKeys = useSelectableKeys()

    if ((
        transaction.info?.type !== 'wallet_interaction' ||
        transaction.info.data.method.type !== 'multisig' ||
        transaction.info.data.method.data.type !== 'submit' ||
        transaction.info.data.method.data.data.transactionId === '0')
    ) {
        return null
    }

    const [custodians, setCustodians] = React.useState<string[]>([])
    const [inProcess, setInProcess] = React.useState(false)
    const [step, setStep] = React.useState(LocalStep.PREVIEW)

    const value = React.useMemo(() => {
        return transaction.info?.data.method.data.data.value
    }, [symbol, transaction])

    let direction: string | undefined,
        address: string | undefined

    if (symbol == null) {
        const txAddress = extractTransactionAddress(transaction)
        direction = TRANSACTION_NAMES[txAddress.direction]
        address = txAddress.address
    }
    else {
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

    const unconfirmedTransaction = React.useMemo(() => {
        return address !== undefined
            ? rpcState.state.accountUnconfirmedTransactions[address][transactionId]
            : undefined
    }, [custodians, transaction])
    const confirmations: string[] = unconfirmedTransaction?.confirmations || []

    const filteredSelectableKeys = React.useMemo(
        () => selectableKeys.filter((key) => !confirmations.includes(key.publicKey)),
        [confirmations, selectableKeys]
    )
    const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry>(filteredSelectableKeys[0])

    const onConfirm = () => {
        setStep(LocalStep.ENTER_PASSWORD)
    }

    const onBack = () => {
        setStep(LocalStep.PREVIEW)
    }

    const onSubmit = async (keyPassword: nt.KeyPassword) => {
        let messageToPrepare: ConfirmMessageToPrepare = {
            publicKey: selectedKey.publicKey,
            transactionId: transactionId,
        }

        if (transaction.inMessage.dst === undefined) return

        setInProcess(true)

        const signedMessage = await rpc.prepareConfirmMessage(
            transaction.inMessage.dst,
            messageToPrepare,
            keyPassword
        )

        rpc.sendMessage(transaction.inMessage.dst, {
            signedMessage,
        })
        drawer.setPanel(undefined)
    }

    React.useEffect(() => {
        if (address !== undefined) {
            ;(async () => {
                try {
                    await rpc.getCustodians(address as string).then((res: string[]) => {
                        setCustodians(res)
                    })
                } catch (e) {}
            })()
        }
    }, [])

    if (step === LocalStep.ENTER_PASSWORD) {
        return (
            <div className="multisig-transaction">
                <header className="multisig-transaction__header">
                    <h2 className="multisig-transaction__header-title noselect">
                        Confirm message
                    </h2>
                </header>

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
            </div>
        )
    }

    return (
        <div className="multisig-transaction">
            <header className="multisig-transaction__header">
                <h2 className="multisig-transaction__header-title noselect">
                    Multisignature transaction
                </h2>
            </header>

            <div className="multisig-transaction__wrapper">
                <div className="transaction-info-tx-details">
                    <div className="transaction-info-tx-details-param">
                        <span className="transaction-info-tx-details-param-desc">Date and time</span>
                        <span className="transaction-info-tx-details-param-value">
                        {new Date(transaction.createdAt * 1000).toLocaleString()}
                    </span>
                    </div>

                    {address !== undefined && (
                        <div className="transaction-info-tx-details-param">
                            <span className="transaction-info-tx-details-param-desc">{direction}</span>
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
                            <div className="transaction-info-tx-details-param">
                                <span className="transaction-info-tx-details-param-desc">
                                    Signatures
                                </span>
                                <span className="transaction-info-tx-details-param-value">
                                    {JSON.stringify(confirmations.length)} of{' '}
                                        {custodians.length} signatures collected
                                </span>
                            </div>

                            {custodians.map((custodian, idx) => {
                                const isSigned = confirmations.includes(custodian)
                                const isInitiator = unconfirmedTransaction?.creator === custodian

                                return (
                                    <div key={custodian} className="transaction-info-tx-details-param">
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
                                            {(!isSigned) && (
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

                <footer className="multisig-transaction__footer">
                    <Button text="Confirm" onClick={onConfirm} />
                </footer>
            </div>
        </div>
    )
}
