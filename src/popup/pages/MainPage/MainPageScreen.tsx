import React, { useEffect, useState } from 'react'
import TonLogo from '../../img/ton-logo.svg'
import TonLogoS from '../../img/ton-logo-s.svg'
import Arrow from '../../img/arrow.svg'
import { connect } from 'react-redux'
import { AppState } from '../../store/app/types'
import { startSubscription } from '../../store/app/actions'
import Decimal from 'decimal.js'
import * as nt from '../../../../nekoton/pkg'
import AccountDetails from '../../components/AccountDetails/AccountDetails'
import UserAssets from '../../components/UserAssets/UserAssets'
import { convertAddress, convertTons } from '../../utils/formatData'
import './main-page.scss'

Decimal.config({
    minE: -500,
    maxE: 500,
    toExpNeg: -500,
    toExpPos: 500,
})

type AssetProps = {
    tonWalletState: nt.AccountState
}

export const Asset: React.FC<AssetProps> = ({ tonWalletState }) => (
    <div className="main-page__user-assets-asset">
        <div style={{ display: 'flex' }}>
            {/*// @ts-ignore*/}
            <TonLogo style={{ marginRight: '16px', minWidth: '40px' }} />
            <div className="main-page__user-assets-asset-number">
                <span className="main-page__user-assets-asset-number-amount">
                    {convertTons(tonWalletState.balance)} TON
                </span>
                <span className="main-page__user-assets-asset-number-dollars">$100.00</span>
            </div>
        </div>
        <Arrow />
    </div>
)

type TransactionProps = {
    transaction: nt.Transaction
}

export const Transaction: React.FC<TransactionProps> = ({ transaction }) => {
    return (
        <>
            <div className="main-page__user-assets-asset">
                <div style={{ display: 'flex', width: '100%' }}>
                    <div style={{ marginRight: '16px', marginTop: '16px', minWidth: '36px' }}>
                        <TonLogoS />
                    </div>
                    <div className="main-page__user-assets-asset-number">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-dollars">
                                {new Date(transaction.createdAt * 1000).toLocaleTimeString()}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-amount">
                                {transaction.inMessage.src &&
                                    convertAddress(transaction.inMessage.src)}
                            </span>
                            <span className="main-page__user-assets-asset-number-income">
                                + {convertTons(transaction.inMessage.value)} TON
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-dollars">
                                Fees: {convertTons(transaction.totalFees)} TON
                            </span>
                        </div>
                        <span
                            className="main-page__user-assets-asset-number-dollars"
                            style={{ color: '#000000', padding: '10px 0 0' }}
                        >
                            Staking reward.
                        </span>
                    </div>
                </div>
            </div>
        </>
    )
}

type TransactionListProps = {
    transactions: nt.Transaction[]
}

export const TransactionsList: React.FC<TransactionListProps> = ({ transactions }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            {transactions?.map((transaction) => {
                return <Transaction transaction={transaction} />
            })}
        </div>
    )
}

interface IMainPageScreen {
    account: string
    tonWalletState: nt.AccountState | null
    transactions: nt.Transaction[]
    setStep: (arg0: number) => void
    startSubscription: (arg0: string) => void
}

const MainPageScreen: React.FC<IMainPageScreen> = ({
    account,
    tonWalletState,
    transactions,
    setStep,
    startSubscription,
}) => {
    const [activeContent, setActiveContent] = useState(0)

    useEffect(() => {
        startSubscription(account)
    }, [])

    return (
        <>
            <AccountDetails
                parentStep={activeContent}
                tonWalletState={tonWalletState}
                account={account}
                setGlobalStep={setStep}
            />
            <UserAssets
                tonWalletState={tonWalletState}
                setActiveContent={setActiveContent}
                transactions={transactions}
            />
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    account: store.app.account,
    tonWalletState: store.app.tonWalletState,
    transactions: store.app.transactions,
})

export default connect(mapStateToProps, {
    startSubscription,
})(MainPageScreen)
