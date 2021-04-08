import React, { useState } from 'react'
import RadioButton from '../../components/RadioButton/RadioButton'
import { Button } from '../../components/button'
import './select-wallet.scss'
import { connect } from 'react-redux'
import { setWalletType } from '../../store/app/actions'

interface ISelectWallet {
    setStep: (arg0: number) => void
    setWalletType: (arg0: string) => void
}

const SelectWallet: React.FC<ISelectWallet> = ({ setStep, setWalletType }) => {
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
                        setStep(6)
                    }}
                />
                <Button text={'Skip'} white />
            </div>
        </div>
    )
}

export default connect(null, {
    setWalletType,
})(SelectWallet)
