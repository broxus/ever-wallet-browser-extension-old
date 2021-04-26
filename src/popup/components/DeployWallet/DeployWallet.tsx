import React, { useEffect, useState } from 'react'
import { Action, convertTons } from '@utils'
import Button from '@components/Button'
import * as nt from '@nekoton'
import QRCode from 'react-qr-code'
import CopyButton from '@components/CopyButton'
import EnterPassword from '@components/EnterPassword'
import SlidingPanel from '@components/SlidingPanel'
import { connect } from 'react-redux'
import { estimateFees, prepareDeploy, prepareDeployMessage } from '@store/app/actions'
import { UnsignedMessage } from '@nekoton'
import './style.scss'

interface IDeployWallet {
    account: nt.AssetsList
    tonWalletState: nt.AccountState | null
    prepareDeploy: (address: string, password: string) => Promise<UnsignedMessage>
    prepareDeployMessage: (address: string) => Promise<UnsignedMessage | null>
    estimateFees: Action<typeof estimateFees>
}

const DeployWallet: React.FC<IDeployWallet> = ({
    account,
    tonWalletState,
    prepareDeploy,
    prepareDeployMessage,
    estimateFees,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [fees, setFees] = useState<string>()

    useEffect(() => {
        ;(async () => {
            const message = await prepareDeployMessage(account.tonWallet.address)
            if (message) {
                const fakeMessage = message.signFake()
                const fees = await estimateFees(account.tonWallet.address, fakeMessage)
                setFees(fees)
            }
        })()
    }, [])

    const deployWallet = async (password: string) => {
        await prepareDeploy(account.tonWallet.address, password)
        setIsOpen(false)
    }

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
                    <Button text={'Deploy'} onClick={() => setIsOpen(true)} disabled={!fees} />
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
            <SlidingPanel isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <EnterPassword handleNext={deployWallet} handleBack={() => setIsOpen(false)} />
            </SlidingPanel>
        </>
    )
}

export default connect(null, { prepareDeploy, prepareDeployMessage, estimateFees })(DeployWallet)
