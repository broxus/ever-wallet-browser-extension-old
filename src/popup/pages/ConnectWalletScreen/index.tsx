import React, { useState } from 'react'
import * as nt from '@nekoton'

import cn from 'classnames'
import './style.scss'
import { Step } from '@common'
import UserPicS from '@img/user-avatar-placeholder-s.svg'
import WebsiteIcon from '@img/website-icon.svg'
import Arrow from '@img/arrow.svg'
import { AppState } from '@store/app/types'
import { connect } from 'react-redux'
import { convertAddress, convertTons } from '@utils'
import Button from '@components/Button'
import SlidingPanel from '@components/SlidingPanel'
import AddNewToken from '@components/AddNewToken'
import EnterPassword from '@components/EnterPassword'

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

interface ISpend {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    setStep: (step: Step) => void
}

const Spend: React.FC<ISpend> = ({ setStep, account, tonWalletState }) => {
    const balance = convertTons(tonWalletState?.balance || '0').toLocaleString()

    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <div className="connect-wallet">
            <div className="connect-wallet__spend-top-panel">
                <div className="connect-wallet__spend-top-panel__network">
                    <div className="connect-wallet__address-entry">
                        <UserPicS />
                        <div className="connect-wallet__spend-top-panel__account">
                            {account?.name}
                        </div>
                    </div>
                    <div className="connect-wallet__network" style={{ marginBottom: '0' }}>
                        Mainnet
                    </div>
                </div>
                <div className="connect-wallet__spend-top-panel__site">
                    <WebsiteIcon />
                    <div className="connect-wallet__address-entry">https://tonbrdige.io</div>
                </div>
                <h3 className="connect-wallet__spend-top-panel__header">
                    Allow this site to spend your WTON?
                </h3>
                <p className="connect-wallet__spend-top-panel__comment">
                    Do you trust this site? By granting this permission, you’re allowing
                    https://app.uniswap.org to withdraw your WTON and automate transactions for you.
                </p>
            </div>
            <div className="connect-wallet__spend-details">
                <p className="connect-wallet__spend-details-title">Transaction details</p>
                <div className="connect-wallet__details__description">
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">Fee</span>
                        <span className="connect-wallet__details__description-param-value">
                            0.12 TON
                        </span>
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">
                            Amount
                        </span>
                        <span className="connect-wallet__details__description-param-value">
                            12 TON
                        </span>
                    </div>
                    <div className="connect-wallet__details__description-param">
                        <span className="connect-wallet__details__description-param-desc">To</span>
                        <span className="connect-wallet__details__description-param-value">
                            {convertAddress(
                                '0x095ea7b30000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488df'
                            )}
                        </span>
                    </div>
                </div>
                <p className="connect-wallet__spend-details-title">Data</p>
                <div className="connect-wallet__details__data">{JSON.stringify(mockData)}</div>
            </div>
            <div className="connect-wallet__buttons">
                <div className="connect-wallet__buttons-button">
                    <Button type="button" white text="Reject" onClick={() => setStep(Step.MAIN)} />
                </div>
                <div className="connect-wallet__buttons-button">
                    <Button type="submit" text="Send" onClick={() => setIsOpen(true)} />
                </div>
            </div>
            <SlidingPanel isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <EnterPassword setStep={setStep} minHeight={'300px'} />
            </SlidingPanel>
        </div>
    )
}

interface IRequestContract {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    setStep: (step: Step) => void
}

const mockData =
    'Function: broxusBridgeCallback(bytes payload, bytes[] signatures) ***\n' +
    'MethodID: 0x8fadb428\n' +
    '[0]:  0000000000000000000000000000000000000000000000000000000000000040\n' +
    '[1]:  0000000000000000000000000000000000000000000000000000000000000260\n' +
    '[2]:  0000000000000000000000000000000000000000000000000000000000000200\n' +
    '[3]:  0000000000000000000000000000000000000000000000000000000000000020\n' +
    '[4]:  d62f564ce88b83dc1a715f48820823502e3b1ae7d129c504f0f5f857c3427831\n' +
    '[5]:  00000000000000000000000000000000000000000000000000000c01570d73c1\n' +
    '[6]:  00000000000000000000000000000000000000000000000000000000607ff0f7\n' +
    '[7]:  0000000000000000000000000000000000000000000000000000000000000000\n' +
    '[8]:  0000000000000000000000000000000000000000000000000000000000000140\n' +
    '[9]:  0000000000000000000000000000000000000000000000000000000000000000\n' +
    '[10]: 651bb00af6a75314fd5479567ad4c411e40e692bfb94db174a05ac0d4a1c8a7c\n' +
    '[11]: 0000000000000000000000000000000000000000000000000000000000000002\n' +
    '[12]: 0000000000000000000000000000000000000000000000000000000000000002\n' +
    '[13]: 000000000000000000000000dceeae4492732c04b5224841286bf7146aa299df\n' +
    '[14]: 0000000000000000000000000000000000000000000000000000000000000080\n' +
    '[15]: 0000000000000000000000000000000000000000000000000000000000000000\n' +
    '[16]: 893d27bb9717bfdff7c5b31ca3c7e9338f6d23d05b3adac14b726bb4281f5e59\n' +
    '[17]: 0000000000000000000000000000000000000000000000000000067518fa5800\n' +
    '[18]: 000000000000000000000000bc5c11abbd453e36cdff349bd9e973f5462e606c\n' +
    '[19]: 0000000000000000000000000000000000000000000000000000000000000002\n' +
    '[20]: 0000000000000000000000000000000000000000000000000000000000000040\n' +
    '[21]: 00000000000000000000000000000000000000000000000000000000000000c0\n' +
    '[22]: 0000000000000000000000000000000000000000000000000000000000000041\n' +
    '[23]: 1256c39a54ecbcabed2e27f8c790dde551867c50cea168041a709aea07b1f456\n' +
    '[24]: 1aed014b5ee052af5e5cabb27390d4543650f5c0d345b7093b9f2eae13a80411\n' +
    '[25]: 1b00000000000000000000000000000000000000000000000000000000000000\n' +
    '[26]: 0000000000000000000000000000000000000000000000000000000000000041\n' +
    '[27]: e2ce13f13256617bdbc5489a159f7f926903e0d7071048b70bd24b99c9a2dc5d\n' +
    '[28]: 3e285adb79bf46bdbe81ab9d0c23a6ce253593d3f0cbeb440a983fcd95290907\n' +
    '[29]: 1c00000000000000000000000000000000000000000000000000000000000000'

const RequestContract: React.FC<IRequestContract> = ({ account, tonWalletState, setStep }) => {
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
                {activeTab == AssetsTab.DETAILS && (
                    <div className="connect-wallet__details__description">
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Contract interaction
                            </span>
                            <span className="connect-wallet__details__description-param-value">
                                https://tonbrdige.io
                            </span>
                        </div>
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Fee
                            </span>
                            <span className="connect-wallet__details__description-param-value">
                                12 TON
                            </span>
                        </div>
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Total
                            </span>
                            <span className="connect-wallet__details__description-param-value">
                                12 TON
                            </span>
                        </div>
                    </div>
                )}
                {activeTab == AssetsTab.DATA && (
                    <div className="connect-wallet__details__data">{JSON.stringify(mockData)}</div>
                )}
            </div>
            <div className="connect-wallet__buttons">
                <div className="connect-wallet__buttons-button">
                    <Button type="button" white text="Reject" onClick={() => setStep(Step.MAIN)} />
                </div>
                <div className="connect-wallet__buttons-button">
                    <Button type="submit" text="Send" />
                </div>
            </div>
        </div>
    )
}

const ConnectWallet: React.FC<IConnectWallet> = ({ setStep, account, tonWalletState }) => {
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SPEND)

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
                <RequestContract
                    account={account}
                    tonWalletState={tonWalletState}
                    setStep={setStep}
                />
            )}
            {localStep == LocalStep.SPEND && (
                <Spend account={account} tonWalletState={tonWalletState} setStep={setStep} />
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
