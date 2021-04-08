import React, { useState } from 'react'
import RadioButton from '../../components/RadioButton/RadioButton'
import { Button } from '../../components/button'
import { connect } from 'react-redux'
import { createAccount, setWalletType } from '../../store/app/actions'
import './select-wallet.scss'
import { AppState } from '../../store/app/types'

interface ISelectWallet {
    publicKey: string
    setStep: (arg0: number) => void
    setWalletType: (arg0: string) => void
    createAccount: any
}

const SelectWallet: React.FC<ISelectWallet> = ({
    publicKey,
    setStep,
    setWalletType,
    createAccount,
}) => {
    const [walletType, updateWalletType] = useState('SafeMultisig (default)')

    const radioChangeHandler = (event: { target: { value: React.SetStateAction<string> } }) => {
        updateWalletType(event.target.value)
    }

    return (
        <div className="select-wallet__content">
            <div className="select-wallet__content-options">
                <h2 className="select-wallet__content-options-title">Select wallet type</h2>
                <RadioButton
                    changed={radioChangeHandler}
                    id="1"
                    isSelected={walletType === 'SafeMultisig (default)'}
                    label="SafeMultisig (default)"
                    value="SafeMultisig (default)"
                />

                <RadioButton
                    changed={radioChangeHandler}
                    id="2"
                    isSelected={walletType === 'SafeMultisig24'}
                    label="SafeMultisig24"
                    value="SafeMultisig24"
                />
                <RadioButton
                    changed={radioChangeHandler}
                    id="3"
                    isSelected={walletType === 'Setcode Multisig'}
                    label="Setcode Multisig"
                    value="Setcode Multisig"
                />

                <RadioButton
                    changed={radioChangeHandler}
                    id="4"
                    isSelected={walletType === 'Surf'}
                    label="Surf"
                    value="Surf"
                />
            </div>
            <div className="select-wallet__content-buttons">
                <Button
                    text={'Next'}
                    onClick={() => {
                        setWalletType(walletType)
                        createAccount('Account 1', publicKey, walletType)
                        setStep(6)
                    }}
                />
                <Button text={'Skip'} white />
            </div>
        </div>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    publicKey: store.app.publicKey,
})

export default connect(mapStateToProps, {
    setWalletType,
    createAccount,
})(SelectWallet)
