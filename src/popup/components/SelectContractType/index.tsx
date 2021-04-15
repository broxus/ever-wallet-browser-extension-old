import React, { useState } from 'react'
import * as nt from '../../../../nekoton/pkg'

import RadioButton from '../RadioButton/RadioButton'
import Button from '../Button/Button'

import './style.scss'

const CONTRACT_TYPES: { [K in nt.ContractType]: string } = {
    SafeMultisigWallet: 'SafeMultisig (default)',
    SafeMultisigWallet24h: 'SafeMultisig24',
    SetcodeMultisigWallet: 'SetcodeMultisigWallet',
    SurfWallet: 'Surf',
    WalletV3: 'WalletV3 (legacy)',
}

interface ISelectWallet {
    onSubmit: (contractType: nt.ContractType) => void
    onReturnBack?: () => void
    onSkip?: () => void
    excludedContracts: nt.ContractType[]
}

const Index: React.FC<ISelectWallet> = ({ onSubmit, onReturnBack, onSkip, excludedContracts }) => {
    const [walletType, updateWalletType] = useState<nt.ContractType>('SafeMultisigWallet')

    return (
        <div className="select-wallet__content">
            <div className="select-wallet__content-options">
                <h2 className="select-wallet__content-options-title">Select wallet type</h2>

                {window.ObjectExt.keys(CONTRACT_TYPES).map((contractType) => {
                    if (excludedContracts.includes(contractType)) {
                        return null
                    }

                    return (
                        <RadioButton<nt.ContractType>
                            onChange={updateWalletType}
                            id={contractType}
                            key={contractType}
                            isSelected={walletType === contractType}
                            label={CONTRACT_TYPES[contractType]}
                            value={contractType}
                        />
                    )
                })}
            </div>
            <div className="select-wallet__content-buttons">
                <Button text={'Next'} onClick={() => onSubmit(walletType)} />
                {onReturnBack && <Button text={'Back'} white onClick={onReturnBack} />}
                {onSkip && <Button text={'Skip'} white onClick={onSkip} />}
            </div>
        </div>
    )
}

export default Index
