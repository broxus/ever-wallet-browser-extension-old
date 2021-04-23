import React from 'react'
import './style.scss'
import { Action, convertAddress, convertTons } from '@utils'
import Input from '@components/Input'
import Button from '@components/Button'
import * as nt from '@nekoton'

interface IDeployWallet {
    account: nt.AssetsList
    tonWalletState: nt.AccountState
}

const DeployWallet: React.FC<IDeployWallet> = ({ account, tonWalletState }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Deploy your wallet</h2>
            <div className="send-screen__form-tx-details">
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Account balance</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {`${convertTons(tonWalletState?.balance || '0').toLocaleString()} TON`}
                    </span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Debit</span>
                    <span className="send-screen__form-tx-details-param-value">0.94 TON</span>
                </div>
            </div>

            <Button
                text={'Deploy'}
                onClick={async () => {
                    await console.log('deploying')
                }}
            />
        </>
    )
}

export default DeployWallet
