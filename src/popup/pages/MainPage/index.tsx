import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import { logOut, startSubscription } from '@store/app/actions'
import { Step } from '@common'
import { Action } from '@utils'
import * as nt from '@nekoton'

import AccountDetails from '@components/AccountDetails'
import UserAssets from '@components/UserAssets'

import SlidingPanel from '@components/SlidingPanel'
import Receive from '@components/Receive'
import Send from '@components/Send'
import KeyStorage from '@components/KeyStorage'
import CreateAccountScreen from '../CreateAccount'
import EnterPassword from '@components/EnterPassword'
import AssetFull from '@components/AssetFull'

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
    const [panelVisible, setPanelVisible] = useState(false)


    // TODO create one handler

    const handleSendReceive = (action: 'send' | 'receive') => {
        setPanelVisible(true)
        setActiveContent(+!(action === 'receive'))
    }

    const handleReceiveClick = () => {
        setPanelVisible(true)
        setActiveContent(0)
    }

    const handleSendClick = () => {
        setPanelVisible(true)
        setActiveContent(1)
    }

    const handleCreateNewAcc = () => {
        setPanelVisible(true)
        setActiveContent(3)
    }

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
                handleReceiveClick={handleReceiveClick}
                handleSendClick={handleSendClick}
                handleCreateNewAcc={handleCreateNewAcc}
            />
            <UserAssets
                tonWalletState={tonWalletState}
                setActiveContent={setActiveContent}
                transactions={transactions}
            />
            <SlidingPanel isOpen={panelVisible} setIsOpen={setPanelVisible}>
                {activeContent === 0 ? (
                    <Receive accountName={account?.name} address={account?.tonWallet.address} />
                ) : activeContent === 1 ? (
                    tonWalletState ? (
                        <Send
                            account={account}
                            tonWalletState={tonWalletState}
                            onBack={() => {
                                setPanelVisible(false)
                            }}
                        />
                    ) : (
                        <></>
                    )
                ) : activeContent === 2 ? (
                    <KeyStorage setActiveContent={setActiveContent} />
                ) : activeContent === 3 ? (
                    <CreateAccountScreen />
                ) : activeContent === 4 ? (
                    <EnterPassword setStep={setStep} minHeight={'170px'} />
                ) : activeContent === 5 ? (
                    <SaveSeed setStep={setStep} />
                ) : activeContent === 6 ? (
                    <AssetFull handleSendReceive={handleSendReceive} />
                ) : (
                    <></>
                )}
            </SlidingPanel>
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
