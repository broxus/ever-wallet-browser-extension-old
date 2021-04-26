import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { Action, convertTons } from '@utils'
import { AppState, DeliveredMessage } from '@store/app/types'
import { estimateFees, prepareDeployMessage, sendMessage } from '@store/app/actions'
import * as nt from '@nekoton'

import Lottie from 'react-lottie-player'
import QRCode from 'react-qr-code'

import Button from '@components/Button'
import CopyButton from '@components/CopyButton'
import EnterPassword from '@components/EnterPassword'
import SlidingPanel from '@components/SlidingPanel'

import FailedAnimation from '@img/lottie/failed.json'
import DoneAnimation from '@img/lottie/done.json'
import MoneyAnimation from '@img/lottie/money.json'

import './style.scss'

type ITransactionExpired = {
    onBack: () => void
}

const TransactionExpired: React.FC<ITransactionExpired> = ({ onBack }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Transaction expired</h2>
            <div className="send-screen__tx-sending">
                <Lottie
                    loop
                    animationData={FailedAnimation}
                    play
                    style={{ width: 150, height: 150 }}
                />
            </div>
            <Button text={'OK'} type={'button'} onClick={onBack} />
        </>
    )
}

type ITransactionSent = {
    onBack: () => void
}

const TransactionSent: React.FC<ITransactionSent> = ({ onBack }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Wallet has been deployed</h2>
            <div className="send-screen__tx-sending">
                <Lottie
                    loop
                    animationData={DoneAnimation}
                    play
                    style={{ width: 150, height: 150 }}
                />
            </div>
            <Button text={'OK'} type={'button'} onClick={onBack} />
        </>
    )
}

export type ITransactionSending = {
    onBack: () => void
}

const TransactionSending: React.FC<ITransactionSending> = ({ onBack }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Deploying wallet...</h2>
            <div className="send-screen__tx-sending">
                <Lottie
                    loop
                    animationData={MoneyAnimation}
                    play
                    style={{ width: 150, height: 150 }}
                />
            </div>
            <Button text={'OK'} type={'button'} onClick={onBack} />
        </>
    )
}

interface IDeployWallet {
    account: nt.AssetsList
    tonWalletState: nt.AccountState | null
    deliveredMessages: DeliveredMessage[]
    expiredMessages: nt.PendingTransaction[]
    prepareDeployMessage: Action<typeof prepareDeployMessage>
    estimateFees: Action<typeof estimateFees>
    sendMessage: Action<typeof sendMessage>
    onBack: () => void
}

const DeployWallet: React.FC<IDeployWallet> = ({
    account,
    tonWalletState,
    deliveredMessages,
    expiredMessages,
    prepareDeployMessage,
    estimateFees,
    sendMessage,
    onBack,
}) => {
    const [passwordModalVisible, setPasswordModalVisible] = useState(false)

    const [fees, setFees] = useState<string>()
    const [unsignedMessage, setUnsignedMessage] = useState<nt.UnsignedMessage>()
    const [pendingTransaction, setPendingTransaction] = useState<nt.PendingTransaction>()

    useEffect(() => {
        ;(async () => {
            const message = await prepareDeployMessage(account.tonWallet.address)
            if (message) {
                const fakeMessage = message.signFake()
                const fees = await estimateFees(account.tonWallet.address, fakeMessage)

                setFees(fees)
                setUnsignedMessage(message)
            }
        })()
    }, [])

    const deployWallet = async (unsignedMessage: nt.UnsignedMessage, password: string) => {
        console.log('Deploying wallet', password)
        const pendingTransaction = await sendMessage(
            account.tonWallet.address,
            unsignedMessage,
            password
        )
        console.log(pendingTransaction)
        setPendingTransaction(pendingTransaction)
    }

    const showConfirm = () => (
        <>
            <h2 className="send-screen__form-title">Deploy your wallet</h2>
            {tonWalletState?.balance !== '0' ? (
                <>
                    <p className="deploy-wallet__comment">
                        Funds will be debited from your balance to deploy.
                    </p>
                    <div className="send-screen__form-tx-details">
                        <div className="send-screen__form-tx-details-param">
                            <span className="send-screen__form-tx-details-param-desc">
                                Account balance
                            </span>
                            <span className="send-screen__form-tx-details-param-value">
                                {`${convertTons(tonWalletState?.balance).toLocaleString()} TON`}
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
                        text={'Deploy'}
                        onClick={() => setPasswordModalVisible(true)}
                        disabled={!fees}
                    />
                </>
            ) : (
                <>
                    <p className="deploy-wallet__comment">
                        You need to have at least 1 TON on your account balance to deploy.
                    </p>
                    <h3 className="receive-screen__form-title">
                        Your address to receive TON funds
                    </h3>
                    <div className="receive-screen__qr-code">
                        <div className="receive-screen__qr-code-code">
                            <QRCode value={`ton://chat/${account?.tonWallet.address}`} size={80} />
                        </div>
                        <div className="receive-screen__qr-code-address">
                            {account?.tonWallet.address}
                        </div>
                    </div>

                    {account && (
                        <CopyButton text={account.tonWallet.address}>
                            <Button text={'Copy address'} />
                        </CopyButton>
                    )}
                </>
            )}
            <SlidingPanel
                isOpen={passwordModalVisible}
                onClose={() => setPasswordModalVisible(false)}
            >
                <EnterPassword
                    handleNext={async (password) => {
                        console.log('Next')
                        if (unsignedMessage) {
                            await deployWallet(unsignedMessage, password)
                        } else {
                            console.error('Message not prepared')
                        }
                    }}
                    handleBack={() => setPasswordModalVisible(false)}
                />
            </SlidingPanel>
        </>
    )

    const showSendingMessage = (pendingTransaction: nt.PendingTransaction) => {
        const close = () => {
            setPendingTransaction(undefined)
            onBack()
        }

        const isDone =
            deliveredMessages.findIndex(
                (item) => item.pendingTransaction.bodyHash == pendingTransaction.bodyHash
            ) >= 0
        if (isDone) {
            return <TransactionSent onBack={close} />
        }

        const isFailed =
            expiredMessages.findIndex((item) => item.bodyHash == pendingTransaction.bodyHash) >= 0
        if (isFailed) {
            return <TransactionExpired onBack={close} />
        }

        return <TransactionSending onBack={close} />
    }

    return (
        <>
            {pendingTransaction == null && showConfirm()}
            {pendingTransaction != null && showSendingMessage(pendingTransaction)}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    deliveredMessages: store.app.deliveredMessages,
    expiredMessages: store.app.expiredMessages,
})

export default connect(mapStateToProps, {
    prepareDeployMessage,
    estimateFees,
    sendMessage,
})(DeployWallet)
