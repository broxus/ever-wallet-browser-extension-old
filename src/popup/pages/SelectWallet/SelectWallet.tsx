import React, { useState } from 'react'
import RadioButton from '../../components/RadioButton/RadioButton'

const SelectWallet: React.FC = () => {
    const [walletType, setWalletType] = useState('SafeMultisig (default)')

    const radioChangeHandler = (event: { target: { value: React.SetStateAction<string> } }) => {
        setWalletType(event.target.value)
    }

    const quickpay =
        walletType === 'QuickPay' ? <input type="text" placeholder="Enter transaction id" /> : null

    return (
        <div className="Apps">
            <div
                className="radio-btn-container"
                style={{ display: 'flex', flexDirection: 'column' }}
            >
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

            {quickpay}

            <h2 style={{ marginTop: '50px' }}>
                {`The selected radio button value is => ${walletType}`}
            </h2>
        </div>
    )
}

export default SelectWallet
