import * as React from 'react'
import { useIntl } from 'react-intl'
import Decimal from 'decimal.js'

import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'
import { useSelectableKeys } from '@popup/hooks/useSelectableKeys'
import { useRpc } from '@popup/providers/RpcProvider'
import { parseError, ignoreCheckPassword } from '@popup/utils'
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
    onSubmit: (password: nt.KeyPassword, delayedDeletion: boolean) => void
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
    const intl = useIntl()
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
        old: boolean
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
                    old: details.version != 'Tip3',
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

    const contractState = accountContractStates[account.tonWallet.address] as
        | nt.ContractState
        | undefined
    const balance = new Decimal(contractState?.balance || '0')

    const isDeployed =
        contractState?.isDeployed ||
        !nt.getContractTypeDetails(account.tonWallet.contractType).requiresSeparateDeploy

    const trySubmit = async (keyPassword: nt.KeyPassword) => {
        setInProcess(true)
        try {
            console.log(keyPassword)
            if (ignoreCheckPassword(keyPassword) || (await checkPassword(keyPassword))) {
                onSubmit(keyPassword, true)
            } else {
                setError(intl.formatMessage({ id: 'ERROR_INVALID_PASSWORD' }))
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
                    ? intl.formatMessage({ id: 'APPROVE_SEND_MESSAGE_APPROVAL_PREVIEW_TITLE' })
                    : intl.formatMessage({ id: 'APPROVE_SEND_MESSAGE_APPROVAL_TITLE' })
            }
            origin={origin}
            className={'approval--send-message'}
        >
            {localStep === ApproveStep.MESSAGE_PREVIEW && (
                <div className="approval__wrapper">
                    <div key="message" className="approval__spend-details">
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({ id: 'APPROVE_SEND_MESSAGE_TERM_RECIPIENT' })}
                            </span>
                            <span className="approval__spend-details-param-value">{recipient}</span>
                        </div>
                        {tokenTransaction != null && (
                            <div className="approval__spend-details-param">
                                <span className="approval__spend-details-param-desc">
                                    {intl.formatMessage({ id: 'APPROVE_SEND_MESSAGE_TERM_AMOUNT' })}
                                </span>
                                <span className="approval__spend-details-param-value approval--send-message__amount">
                                    <AssetIcon
                                        type={'token_wallet'}
                                        address={tokenTransaction.rootTokenContract}
                                        old={tokenTransaction.old}
                                        className="root-token-icon noselect"
                                    />
                                    <span className="token-amount-text">
                                        {convertCurrency(
                                            tokenTransaction.amount,
                                            tokenTransaction.decimals
                                        )}
                                    </span>
                                    &nbsp;
                                    <span className="root-token-name">
                                        {convertTokenName(tokenTransaction.symbol)}
                                    </span>
                                </span>
                            </div>
                        )}
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {tokenTransaction == null
                                    ? intl.formatMessage({ id: 'APPROVE_SEND_MESSAGE_TERM_AMOUNT' })
                                    : intl.formatMessage({
                                          id: 'APPROVE_SEND_MESSAGE_TERM_ATTACHED_AMOUNT',
                                      })}
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
                                    {intl.formatMessage({
                                        id: 'APPROVE_SEND_MESSAGE_INSUFFICIENT_FUNDS',
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="approval__spend-details-param">
                            <span className="approval__spend-details-param-desc">
                                {intl.formatMessage({
                                    id: 'APPROVE_SEND_MESSAGE_TERM_BLOCKCHAIN_FEE',
                                })}
                            </span>
                            {isDeployed && (
                                <span className="approval__spend-details-param-value approval--send-message__amount">
                                    <TonAssetIcon className="root-token-icon noselect" />
                                    {fees != null
                                        ? `~${convertTons(fees)} ${NATIVE_CURRENCY}`
                                        : intl.formatMessage({ id: 'CALCULATING_HINT' })}
                                </span>
                            )}
                            {!isDeployed && (
                                <div className="check-seed__content-error">
                                    {intl.formatMessage({
                                        id: 'APPROVE_SEND_MESSAGE_OPERATION_NOT_POSSIBLE',
                                    })}
                                </div>
                            )}
                        </div>
                        {payload && (
                            <div className="approval__spend-details-param">
                                <span className="approval__spend-details-param-desc">
                                    {intl.formatMessage({
                                        id: 'APPROVE_SEND_MESSAGE_TERM_DATA',
                                    })}
                                </span>
                                <div className="approval__spend-details-param-data">
                                    <div className="approval__spend-details-param-data__method">
                                        <span>
                                            {intl.formatMessage({
                                                id: 'APPROVE_SEND_MESSAGE_TERM_DATA_METHOD',
                                            })}
                                        </span>
                                        <span>{payload.method}</span>
                                    </div>
                                    {iterateItems(payload.params)}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="approval__footer">
                        <Button
                            type="button"
                            white
                            text={intl.formatMessage({ id: 'REJECT_BTN_TEXT' })}
                            disabled={inProcess}
                            onClick={onReject}
                        />
                        <Button
                            type="submit"
                            text={intl.formatMessage({
                                id: 'SEND_BTN_TEXT',
                            })}
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
                                      old: tokenTransaction.old,
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
