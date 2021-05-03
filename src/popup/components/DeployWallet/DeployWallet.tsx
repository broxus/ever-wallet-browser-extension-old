import React, { useEffect, useState } from 'react'
import { convertTons } from '@shared/utils'
import * as nt from '@nekoton'

import QRCode from 'react-qr-code'

import Button from '@popup/components/Button'
import CopyButton from '@popup/components/CopyButton'
import EnterPassword from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import TransactionProgress from '@popup/components/TransactionProgress'

import './style.scss'

interface IDeployWallet {
    account: nt.AssetsList
    tonWalletState: nt.ContractState | null
    estimateFees: () => Promise<string>
    prepareDeployMessage: (keyPassword: nt.KeyPassword) => Promise<nt.SignedMessage>
    sendMessage: (params: nt.SignedMessage) => Promise<nt.Transaction>
    onBack: () => void
}

const DeployWallet: React.FC<IDeployWallet> = ({
    account,
    tonWalletState,
    estimateFees,
    prepareDeployMessage,
    sendMessage,
    onBack,
}) => {
    const [inProcess, setInProcess] = useState(false)
    const [error, setError] = useState<string>()
    const [passwordModalVisible, setPasswordModalVisible] = useState(false)
    const [fees, setFees] = useState<string>()

    useEffect(() => {
        if (tonWalletState != null && !tonWalletState.isDeployed) {
            estimateFees()
                .then((fees) => {
                    setFees(fees)
                })
                .catch(console.error)
        }
    }, [tonWalletState])

    const [pendingResponse, setPendingResponse] = useState<Promise<nt.Transaction>>()

    const submitPassword = async (password: string) => {
        const keyPassword: nt.KeyPassword = {
            type: 'encrypted_key',
            data: {
                publicKey: account.tonWallet.publicKey,
                password,
            },
        }

        setError(undefined)
        setInProcess(true)
        try {
            const signedMessage = await prepareDeployMessage(keyPassword)
            setPendingResponse(sendMessage(signedMessage))
        } catch (e) {
            setError(e.toString())
        } finally {
            setInProcess(false)
        }
    }

    if (pendingResponse == null) {
        return (
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
                                <QRCode
                                    value={`ton://chat/${account?.tonWallet.address}`}
                                    size={80}
                                />
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

export default DeployWallet
