import React, { useState } from 'react'
import * as nt from '@nekoton'

import cn from 'classnames'
import './style.scss'
import { Step } from '@common'
import UserPicS from '@img/user-avatar-placeholder-s.svg'
import Arrow from '@img/arrow.svg'
import { AppState } from '@store/app/types'
import { connect } from 'react-redux'
import { convertAddress, convertTons } from '@utils'

type IConnectWallet = {
    setStep: (step: Step) => void
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
}

enum AssetsTab {
    DETAILS,
    DATA,
}

enum LocalStep {
    REQUEST_CONTRACT,
    SPEND,
    CONNECT_WALLET,
}

interface IRequestContract {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
}

const RequestContract: React.FC<IRequestContract> = ({ account, tonWalletState }) => {
    const [activeTab, setActiveTab] = useState<AssetsTab>(AssetsTab.DETAILS)

    const balance = convertTons(tonWalletState?.balance || '0').toLocaleString()

    return (
        <div className="connect-wallet">
            <div className="connect-wallet__top-panel">
                <div className="connect-wallet__network">Mainnet</div>
                <div className="connect-wallet__address">
                    <div className="connect-wallet__address-entry">
                        <UserPicS />
                        <div className="connect-wallet__address-entry">{account?.name}</div>
                    </div>
                    <Arrow />
                    <div className="connect-wallet__address-entry">
                        <UserPicS />
                        <div className="connect-wallet__address-entry">
                            {convertAddress(account?.tonWallet.address)}
                        </div>
                    </div>
                </div>
                <p className="connect-wallet__top-panel__title">Contract interaction</p>
                <p className="connect-wallet__top-panel__source">https://tonbrdige.io</p>
                <div className="connect-wallet__top-panel__balance">
                    {balance.split('.')?.[0]}
                    <span className="connect-wallet__top-panel__balance-decimals">
                        {`.${balance.split('.')?.[1] || '00'} TON`}
                    </span>
                </div>
            </div>

            <div className="connect-wallet__details">
                <div className="connect-wallet__details__panel">
                    <div
                        className={cn('connect-wallet__details__panel__tab', {
                            _active: activeTab == AssetsTab.DETAILS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.DETAILS)}
                    >
                        Details
                    </div>
                    <div
                        className={cn('connect-wallet__details__panel__tab', {
                            _active: activeTab == AssetsTab.DATA,
                        })}
                        onClick={() => setActiveTab(AssetsTab.DATA)}
                    >
                        Data
                    </div>
                </div>
                {activeTab == AssetsTab.DETAILS && <div>Details</div>}
                {activeTab == AssetsTab.DATA && <div>Data</div>}
            </div>
        </div>
    )
}

const ConnectWallet: React.FC<IConnectWallet> = ({ setStep, account, tonWalletState }) => {
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.REQUEST_CONTRACT)

    const [password, setPassword] = useState<string>('')

    const onSubmit = async () => {
        try {
            setStep(Step.MAIN)
        } catch (e) {
            console.log(e, 'e')
        }
    }

    return (
        <>
            {localStep == LocalStep.REQUEST_CONTRACT && (
                <RequestContract account={account} tonWalletState={tonWalletState} />
            )}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    account: store.app.selectedAccount,
    tonWalletState: store.app.tonWalletState,
    transactions: store.app.transactions,
})

export default connect(mapStateToProps)(ConnectWallet)
