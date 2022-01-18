import * as React from 'react'
import Decimal from 'decimal.js'

import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'
import { useSelectableKeys } from '@popup/hooks/useSelectableKeys'
import { useRpc } from '@popup/providers/RpcProvider'
import { parseError } from '@popup/utils'
import { PendingApproval, TransferMessageToPrepare } from '@shared/backgroundApi'
import { convertCurrency, convertTokenName, convertTons } from '@shared/utils'

import Approval from '../Approval'
import AssetIcon, { TonAssetIcon } from '@popup/components/AssetIcon'
import Button from '@popup/components/Button'
import { EnterPassword } from '@popup/components/Send/components'

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
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    onSubmit: (password: nt.KeyPassword) => void
    onReject: () => void
}

export function ApproveSendMessage({
    approval,
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
    const [fees, setFees] = React.useState<string>()
    const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry | undefined>(keys[0])
    const [tokenTransaction, setTokenTransaction] = React.useState<{
        amount: string
        symbol: string
        decimals: number
        rootTokenContract: string
    }>()

    React.useEffect(() => {
        if (
            knownPayload?.type !== 'token_outgoing_transfer' &&
            knownPayload?.type !== 'token_swap_back'
        ) {
            return
        }

        rpc.getTokenRootDetailsFromTokenWallet(recipient)
            .then((details) => {
                setTokenTransaction({
                    amount: knownPayload.data.tokens,
                    symbol: details.symbol,
                    decimals: details.decimals,
                    rootTokenContract: details.address,
                })
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
            .estimateFees(account.tonWallet.address, messageToPrepare, {})
            .then((fees) => setFees(fees))
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
        } catch (e: any) {
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
            <div className="approval__spend-details-param-data__block" key={i}>
                <div className="approval__spend-details-param-data__block--param-name">{key}</div>
                <div className="approval__spend-details-param-data__block--value">
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
        <Approval
            account={account}
            title={
                localStep === ApproveStep.MESSAGE_PREVIEW
                    ? 'Send internal message'
                    : 'Confirm message'
            }
            origin={origin}
            className={'approval--send-message'}
        >
            {localStep === ApproveStep.MESSAGE_PREVIEW && (
                <div className="approval__wrapper">
                    <div key="message" className="approval__spend-details">
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">Recipient</span>
                            <span className="approval__spend-details-param-value">{recipient}</span>
                        </div>
                        {tokenTransaction != null && (
                            <div className="approval__spend-details-param">
                                <span className="approval__spend-details-param-desc">Amount</span>
                                <span className="approval__spend-details-param-value approval--send-message__amount">
                                    <AssetIcon
                                        type={'token_wallet'}
                                        address={tokenTransaction.rootTokenContract}
                                        className="root-token-icon noselect"
                                    />
                                    {convertCurrency(
                                        tokenTransaction.amount,
                                        tokenTransaction.decimals
                                    )}
                                    &nbsp;
                                    <span className="root-token-name">
                                        {convertTokenName(tokenTransaction.symbol)}
                                    </span>
                                </span>
                            </div>
                        )}
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {tokenTransaction == null ? 'Amount' : 'Attached amount'}
                            </span>
                            <span className="approval__spend-details-param-value approval--send-message__amount">
                                <TonAssetIcon className="root-token-icon noselect" />
                                {convertTons(amount)} {NATIVE_CURRENCY}
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
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                Blockchain fee
                            </span>
                            <span className="approval__spend-details-param-value approval--send-message__amount">
                                <TonAssetIcon className="root-token-icon noselect" />
                                {fees != null
                                    ? `~${convertTons(fees)} ${NATIVE_CURRENCY}`
                                    : 'calculating...'}
                            </span>
                        </div>
                        {payload && (
                            <div className="approval__spend-details-param">
                                <span className="approval__spend-details-param-desc">Data</span>
                                <div className="approval__spend-details-param-data">
                                    <div className="approval__spend-details-param-data__method">
                                        <span>Method:</span>
                                        <span>{payload.method}</span>
                                    </div>
                                    {iterateItems(payload.params)}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="approval__footer">
                        <Button type="button" white text="Reject" onClick={onReject} />
                        <Button
                            type="submit"
                            text="Send"
                            disabled={balance.lessThan(amount) || selectedKey == null}
                            onClick={() => {
                                setLocalStep(ApproveStep.ENTER_PASSWORD)
                            }}
                        />
                    </footer>
                </div>
            )}

            {localStep === ApproveStep.ENTER_PASSWORD && selectedKey != null && (
                <EnterPassword
                    keyEntries={keys}
                    keyEntry={selectedKey}
                    amount={
                        tokenTransaction == null
                            ? { type: 'ton_wallet', data: { amount } }
                            : {
                                  type: 'token_wallet',
                                  data: {
                                      amount: tokenTransaction.amount,
                                      attachedAmount: amount,
                                      symbol: tokenTransaction.symbol,
                                      decimals: tokenTransaction.decimals,
                                      rootTokenContract: tokenTransaction.rootTokenContract,
                                  },
                              }
                    }
                    recipient={recipient}
                    fees={fees}
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
        </Approval>
    )
}
