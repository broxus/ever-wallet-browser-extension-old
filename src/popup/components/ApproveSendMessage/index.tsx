import * as React from 'react'
import Decimal from 'decimal.js'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import UserAvatar from '@popup/components/UserAvatar'
import WebsiteIcon from '@popup/components/WebsiteIcon'
import { EnterPassword } from '@popup/components/Send/components'
import { useSelectableKeys } from '@popup/hooks/useSelectableKeys'
import { useRpc } from '@popup/providers/RpcProvider'
import { Fees, parseError } from '@popup/utils'
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

    const [inProcess, setInProcess] = React.useState(false)

    const account = React.useMemo(() => accountEntries[sender], [sender])
    if (account == null) {
        if (!inProcess) {
            onReject()
        }
        setInProcess(true)
        return null
    }

    const { keys } = useSelectableKeys(account)

    const [localStep, setLocalStep] = React.useState(ApproveStep.MESSAGE_PREVIEW)
    const [error, setError] = React.useState<string>()
    const [fees, setFees] = React.useState<Fees>()
    const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry | undefined>(keys[0])

    React.useEffect(() => {
        if (
            knownPayload?.type !== 'token_outgoing_transfer' &&
            knownPayload?.type !== 'token_swap_back'
        ) {
            return
        }

        rpc.getTokenRootDetailsFromTokenWallet(recipient)
            .then((details) => {
                // TODO: set details
                console.log(details)
            })
            .catch(() => {
                /*do nothing*/
            })
    }, [recipient, knownPayload])

    const updateFees = async () => {
        if (selectedKey == null) {
            return
        }

        let messageToPrepare: TransferMessageToPrepare = {
            publicKey: selectedKey.publicKey,
            recipient,
            amount,
            payload: undefined,
        }

        await rpc
            .estimateFees(account.tonWallet.address, messageToPrepare)
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
            setError(parseError(e))
        } finally {
            setInProcess(false)
        }
    }

    React.useEffect(() => {
        updateFees()
    }, [selectedKey])

    const iterateItems = (object: object) => {
        return Object.entries(object).map(([key, value], i) => (
            <div className="approve-send-message__spend-details-param-data__block" key={i}>
                <div className="approve-send-message__spend-details-param-data__block--param-name">
                    {key}
                </div>
                <div className="approve-send-message__spend-details-param-data__block--value">
                    {value instanceof Array ? (
                        <pre>{JSON.stringify(value, undefined, 2)}</pre>
                    ) : typeof value === 'object' ? (
                        iterateItems(value)
                    ) : (
                        value.toString()
                    )}
                </div>
            </div>
        ))
    }

    return (
        <div className="approve-send-message">
            <header className="approve-send-message__header">
                <div className="approve-send-message__meta">
                    <div className="approve-send-message__account">
                        <UserAvatar address={account.tonWallet.address} small />
                        <div className="approve-send-message__account-name">{account?.name}</div>
                    </div>
                    <div className="approve-send-message__network">{networkName}</div>
                </div>
                <div className="approve-send-message__origin-source">
                    <WebsiteIcon origin={origin} />
                    <div className="approve-send-message__origin-source-value">{origin}</div>
                </div>
                {localStep === ApproveStep.MESSAGE_PREVIEW && (
                    <h2 className="approve-send-message__header-title noselect">
                        Send internal message
                    </h2>
                )}
                {localStep === ApproveStep.ENTER_PASSWORD && (
                    <h2 className="approve-send-message__header-title noselect">Confirm message</h2>
                )}
            </header>

            {localStep === ApproveStep.MESSAGE_PREVIEW && (
                <div className="approve-send-message__wrapper">
                    <div key="message" className="approve-send-message__spend-details">
                        <div className="approve-send-message__spend-details-param">
                            <span className="approve-send-message__spend-details-param-desc">
                                Recipient
                            </span>
                            <span className="approve-send-message__spend-details-param-value">
                                {recipient}
                            </span>
                        </div>
                        <div className="approve-send-message__spend-details-param">
                            <span className="approve-send-message__spend-details-param-desc">
                                Amount
                            </span>
                            <span className="approve-send-message__spend-details-param-value">
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
                        <div className="approve-send-message__spend-details-param">
                            <span className="approve-send-message__spend-details-param-desc">
                                Blockchain fee
                            </span>
                            <span className="approve-send-message__spend-details-param-value">
                                {fees?.transactionFees !== undefined
                                    ? `~${convertTons(fees.transactionFees)} TON`
                                    : 'calculating...'}
                            </span>
                        </div>
                        {payload && (
                            <div className="approve-send-message__spend-details-param">
                                <span className="approve-send-message__spend-details-param-desc">
                                    Data
                                </span>
                                <div className="approve-send-message__spend-details-param-data">
                                    <div className="approve-send-message__spend-details-param-data__method">
                                        <span>Method:</span>
                                        <span>{payload.method}</span>
                                    </div>
                                    {iterateItems(payload.params)}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="approve-send-message__footer">
                        <div className="approve-send-message__buttons-button">
                            <Button type="button" white text="Reject" onClick={onReject} />
                        </div>
                        <div className="approve-send-message__buttons-button">
                            <Button
                                type="submit"
                                text="Send"
                                disabled={balance.lessThan(amount) || selectedKey == null}
                                onClick={() => {
                                    setLocalStep(ApproveStep.ENTER_PASSWORD)
                                }}
                            />
                        </div>
                    </footer>
                </div>
            )}

            {localStep === ApproveStep.ENTER_PASSWORD && selectedKey != null && (
                <EnterPassword
                    keyEntries={keys}
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
    )
}
