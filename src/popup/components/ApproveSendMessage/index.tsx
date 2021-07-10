import * as React from 'react'
import Decimal from 'decimal.js'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
// import EnterPassword from '@popup/components/EnterPassword'
// import SlidingPanel from '@popup/components/SlidingPanel'
import UserAvatar from '@popup/components/UserAvatar'
import WebsiteIcon from '@popup/components/WebsiteIcon'
import { EnterPassword } from '@popup/components/Send/components'
import { useSelectableKeys } from '@popup/hooks/useSelectableKeys'
import { useRpc } from '@popup/providers/RpcProvider'
import { Fees } from '@popup/utils'
import { PendingApproval, TransferMessageToPrepare } from '@shared/backgroundApi'
import { convertTons, parseTons } from '@shared/utils'

import './style.scss'

enum ApproveStep {
    MESSAGE_PREVIEW,
    ENTER_PASSWORD,
}

type Props = {
    approval: PendingApproval<'sendMessage'>
    accountContractStates: { [address: string]: nt.ContractState }
    accountEntries: { [address: string]: nt.AssetsList }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    networkName: string
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    onSubmit: (password: nt.KeyPassword) => void
    onReject: () => void
}

export function ApproveSendMessage({
    approval,
    networkName,
    accountEntries,
    accountContractStates,
    checkPassword,
    onReject,
    onSubmit,
}: Props): JSX.Element | null {
    const rpc = useRpc()

    const { origin } = approval
    const { sender, recipient, amount, payload, knownPayload } = approval.requestData

    console.log('KNOWN PAYLOAD:', knownPayload, approval.requestData) // TODO: remove

    const [inProcess, setInProcess] = React.useState(false)

    const account = React.useMemo(() => accountEntries[sender], [sender])
    if (account == null) {
        if (!inProcess) {
            onReject()
        }
        setInProcess(true)
        return null
    }

    const selectableKeys = useSelectableKeys(account)

    // if (selectableKeys[0] == null) {
    //     return null
    // }

    const [localStep, setLocalStep] = React.useState(ApproveStep.MESSAGE_PREVIEW)
    const [error, setError] = React.useState<string>()
    const [fees, setFees] = React.useState<Fees>()
    const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry>(selectableKeys[0])

    const updateFees = async () => {
        let messageToPrepare: TransferMessageToPrepare = {
            publicKey: selectedKey.publicKey,
            recipient: nt.repackAddress(recipient), //shouldn't throw exceptions due to higher level validation
            amount: parseTons(amount),
            payload: undefined,
        }

        await rpc.estimateFees(account.tonWallet.address, messageToPrepare)
            .then((transactionFees) => {
                setFees({
                    transactionFees,
                    attachedAmount: undefined,
                })
            })
            .catch(console.error)
    }

    const contractState = accountContractStates[account.tonWallet.address]
    const balance = new Decimal(contractState?.balance || '0')

    const trySubmit = async (keyPassword: nt.KeyPassword) => {
        setInProcess(true)
        try {
            const isValid = await checkPassword(keyPassword)
            if (isValid) {
                onSubmit(keyPassword)
            } else {
                setError('Invalid password')
            }
        } catch (e) {
            setError(e.toString())
        } finally {
            setInProcess(false)
        }
    }

    React.useEffect(() => {
        updateFees()
    }, [selectedKey])

    return (
        <div className="send-message">
            <header className="send-message__header">
                <div className="send-message__meta">
                    <div className="send-message__account">
                        <UserAvatar address={account.tonWallet.address} small />
                        <div className="send-message__account-name">
                            {account?.name}
                        </div>
                    </div>
                    <div className="send-message__network">{networkName}</div>
                </div>
                <div className="send-message__origin-source">
                    <WebsiteIcon origin={origin} />
                    <div className="send-message__origin-source-value">{origin}</div>
                </div>
                {localStep === ApproveStep.MESSAGE_PREVIEW && (
                    <h3 className="send-message__header-title noselect">
                        Send internal message
                    </h3>
                )}
                {localStep === ApproveStep.ENTER_PASSWORD && (
                    <h3 className="send-message__header-title noselect">
                        Confirm message
                    </h3>
                )}
            </header>

            <div className="send-message__wrapper">
                {localStep === ApproveStep.MESSAGE_PREVIEW && (
                    <>
                        <div key="message" className="send-message__spend-details">
                            <div className="send-message__spend-details-param">
                            <span className="send-message__spend-details-param-desc">
                                Recipient
                            </span>
                                <span className="send-message__spend-details-param-value">
                                {recipient}
                            </span>
                            </div>
                            <div className="send-message__spend-details-param">
                            <span className="send-message__spend-details-param-desc">
                                Amount
                            </span>
                                <span className="send-message__spend-details-param-value">
                                {convertTons(amount)} TON
                            </span>
                                {balance.lessThan(amount) && (
                                    <div
                                        className="check-seed__content-error"
                                        style={{ marginBottom: '16px', marginTop: '-12px' }}
                                    >
                                        Insufficient funds
                                    </div>
                                )}
                            </div>
                            <div className="send-message__spend-details-param">
                                <span className="send-message__spend-details-param-desc">
                                    Blockchain fee
                                </span>
                                <span className="send-message__spend-details-param-value">
                                    {fees?.transactionFees !== undefined
                                        ? `~${convertTons(fees.transactionFees)} TON`
                                        : 'calculating...'}
                                </span>
                            </div>
                            {payload && (
                                <div className="send-message__spend-details-param">
                                <span className="send-message__spend-details-param-desc">
                                    Data
                                </span>
                                    <div className="send-message__spend-details-param-data">
                                        <div className="send-message__spend-details-param-data__method">
                                            <span>Method:</span>
                                            <span>{payload.method}</span>
                                        </div>
                                        {Object.entries(payload.params).map(([key, value], i) => (
                                            <div
                                                className="send-message__spend-details-param-data__block"
                                                key={i}
                                            >
                                                <div className="send-message__spend-details-param-data__block--param-name">
                                                    {key}
                                                </div>
                                                {value instanceof Array ? (
                                                    <div className="send-message__spend-details-param-data__block--value">
                                                        {JSON.stringify(value, undefined, 4)}
                                                    </div>
                                                ) : (
                                                    <div className="send-message__spend-details-param-data__block--value">
                                                        {value.toString()}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="send-message__footer">
                            <div className="send-message__buttons-button">
                                <Button type="button" white text="Reject" onClick={onReject} />
                            </div>
                            <div className="send-message__buttons-button">
                                <Button
                                    type="submit"
                                    text="Send"
                                    disabled={balance.lessThan(amount)}
                                    onClick={() => {
                                        setLocalStep(ApproveStep.ENTER_PASSWORD)
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {localStep === ApproveStep.ENTER_PASSWORD && (
                    <EnterPassword
                        keyEntries={selectableKeys}
                        keyEntry={selectedKey}
                        currencyName="TON"
                        fees={fees}
                        params={{ recipient, amount: convertTons(amount) }}
                        error={error}
                        disabled={inProcess}
                        showHeading={false}
                        onSubmit={trySubmit}
                        onBack={() => {
                            setLocalStep(ApproveStep.MESSAGE_PREVIEW)
                        }}
                        onChangeKeyEntry={setKey}
                    />
                )}
            </div>

            {/*
            <SlidingPanel
                isOpen={passwordModalVisible}
                onClose={() => setPasswordModalVisible(false)}
            >
                <EnterPassword
                    disabled={inProcess}
                    error={error}
                    handleNext={trySubmit}
                    handleBack={() => setPasswordModalVisible(false)}
                />
            </SlidingPanel>
            */}
        </div>
    )
}
