import React, { useEffect, useState } from 'react'
import Decimal from 'decimal.js'
import { convertTons } from '@shared/utils'
import { MessageToPrepare } from '@shared/backgroundApi'
import { prepareKey } from '@popup/utils'
import * as nt from '@nekoton'

import QRCode from 'react-qr-code'

import Button from '@popup/components/Button'
import CopyButton from '@popup/components/CopyButton'
import EnterPassword from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import TransactionProgress from '@popup/components/TransactionProgress'

interface ICollectTokens {
    account: nt.AssetsList
    keyEntry: nt.KeyStoreEntry
    tonWalletState: nt.ContractState | undefined
    ethEventAddress: string
    estimateFees: (params: MessageToPrepare) => Promise<string>
    prepareMessage: (
        params: MessageToPrepare,
        keyPassword: nt.KeyPassword
    ) => Promise<nt.SignedMessage>
    sendMessage: (params: nt.SignedMessage) => Promise<nt.Transaction>
    onBack: () => void
}

const CollectTokens: React.FC<ICollectTokens> = ({
    account,
    keyEntry,
    tonWalletState,
    ethEventAddress,
    estimateFees,
    prepareMessage,
    sendMessage,
    onBack,
}) => {
    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = useState(false)
    const [messageToPrepare, setMessageToPrepare] = useState<MessageToPrepare>()
    const [fees, setFees] = useState<string>()

    const [pendingResponse, setPendingResponse] = useState<Promise<nt.Transaction>>()

    useEffect(() => {
        const internalMessage = nt.TokenWallet.makeCollectTokensCall(ethEventAddress)

        const messageToPrepare = {
            amount: internalMessage.amount,
            payload: internalMessage.body,
            recipient: internalMessage.destination,
        }
        setMessageToPrepare(messageToPrepare)

        setInProcess(true)
        estimateFees(messageToPrepare)
            .then((fees) => {
                console.log(fees)
                setFees(fees)
            })
            .catch((e) => {
                setError(e.toString())
            })
            .finally(() => {
                setInProcess(false)
            })
    }, [tonWalletState])

    const submitPassword = async (password: string) => {
        if (messageToPrepare == null) {
            return
        }

        const keyPassword = prepareKey(keyEntry, password)

        setError(undefined)
        setInProcess(true)
        try {
            const signedMessage = await prepareMessage(messageToPrepare, keyPassword)
            setPendingResponse(sendMessage(signedMessage))
        } catch (e) {
            setError(e.toString())
        } finally {
            setInProcess(false)
        }
    }

    if (pendingResponse == null) {
        const balance = new Decimal(tonWalletState?.balance || '0')
        const totalAmount = new Decimal(messageToPrepare?.amount || '0').add(fees || '0')

        return (
            <>
                <h2 className="send-screen__form-title">Collect tokens</h2>
                {balance.greaterThanOrEqualTo(totalAmount) ? (
                    <>
                        <p className="deploy-wallet__comment">
                            Internal message will execute callback
                        </p>
                        <div className="send-screen__form-tx-details">
                            <div className="send-screen__form-tx-details-param">
                                <span className="send-screen__form-tx-details-param-desc">
                                    Amount
                                </span>
                                <span className="send-screen__form-tx-details-param-value">
                                    {messageToPrepare
                                        ? `${convertTons(
                                              messageToPrepare.amount
                                          ).toLocaleString()} TON`
                                        : 'calculating...'}
                                </span>
                            </div>
                            <div className="send-screen__form-tx-details-param">
                                <span className="send-screen__form-tx-details-param-desc">Fee</span>
                                <span className="send-screen__form-tx-details-param-value">
                                    {fees ? `${convertTons(fees)} TON` : 'calculating...'}
                                </span>
                            </div>
                        </div>
                        <Button
                            text={'Collect'}
                            onClick={() => setPasswordModalVisible(true)}
                            disabled={fees == null || messageToPrepare == null}
                        />
                    </>
                ) : (
                    <>
                        <p className="deploy-wallet__comment">
                            You need to have at least ${convertTons(totalAmount.toString())} TON to
                            collect tokens.
                        </p>
                        <h3 className="receive-screen__form-title noselect">
                            Your address to receive TON
                        </h3>
                        <div className="receive-screen__qr-code">
                            <div className="receive-screen__qr-code-code">
                                <QRCode
                                    value={`ton://chat/${account.tonWallet.address}`}
                                    size={80}
                                />
                            </div>
                            <div className="receive-screen__qr-code-address">
                                {account.tonWallet.address}
                            </div>
                        </div>
                        <CopyButton text={account.tonWallet.address}>
                            <Button text={'Copy address'} />
                        </CopyButton>
                    </>
                )}
                <SlidingPanel
                    isOpen={passwordModalVisible}
                    onClose={() => setPasswordModalVisible(false)}
                >
                    <EnterPassword
                        disabled={inProcess}
                        error={error}
                        handleNext={submitPassword}
                        handleBack={() => setPasswordModalVisible(false)}
                    />
                </SlidingPanel>
            </>
        )
    } else {
        return <TransactionProgress pendingResponse={pendingResponse} onBack={onBack} />
    }
}

export default CollectTokens
