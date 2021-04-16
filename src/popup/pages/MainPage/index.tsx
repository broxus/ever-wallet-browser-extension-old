import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import { logOut, startSubscription } from '@store/app/actions'
import { Step } from '@common'
import { Action } from '@utils'
import * as nt from '@nekoton'

import AccountDetails from '@components/AccountDetails'
import UserAssets from '@components/UserAssets'

import './style.scss'

interface IMainPage {
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    transactions: nt.Transaction[]
    setStep: (step: Step) => void
    startSubscription: Action<typeof startSubscription>
    logOut: Action<typeof logOut>
}

const MainPage: React.FC<IMainPage> = ({
    account,
    tonWalletState,
    transactions,
    setStep,
    startSubscription,
    logOut,
}) => {
    const [activeContent, setActiveContent] = useState(0)

    useEffect(() => {
        if (account != null) {
            startSubscription(account.tonWallet.address).then(() => {})
        }
    }, [])

    return (
        <>
            <AccountDetails
                account={account}
                tonWalletState={tonWalletState}
                onLogOut={async () => {
                    await logOut()
                    setStep(Step.WELCOME)
                }}
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
    account: store.app.selectedAccount,
    tonWalletState: store.app.tonWalletState,
    transactions: store.app.transactions,
})

export default connect(mapStateToProps, {
    startSubscription,
    logOut,
})(MainPage)
