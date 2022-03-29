import React, { useState } from 'react'
import { useIntl } from 'react-intl'
import * as nt from '@nekoton'

import RadioButton from '@popup/components/RadioButton'
import Button from '@popup/components/Button'

import './style.scss'

const CONTRACT_TYPES: { [K in nt.ContractType]: string } = {
    SafeMultisigWallet: 'SafeMultisig (default)',
    SafeMultisigWallet24h: 'SafeMultisig24',
    BridgeMultisigWallet: 'BridgeMultisigWallet',
    SurfWallet: 'Surf',
    WalletV3: 'WalletV3',
    SetcodeMultisigWallet: 'SetcodeMultisigWallet',
}

interface ISelectWallet {
    onSubmit: (contractType: nt.ContractType) => void
    onBack?: () => void
    onSkip?: () => void
    excludedContracts?: nt.ContractType[]
}

const SelectContractType: React.FC<ISelectWallet> = ({
    onSubmit,
    onBack,
    onSkip,
    excludedContracts,
}) => {
    const intl = useIntl()
    const [walletType, updateWalletType] = useState<nt.ContractType>('SafeMultisigWallet')

    return (
        <div className="select-wallet">
            <div className="select-wallet__content">
                <div className="select-wallet__content-options">
                    <h2 className="select-wallet__content-options-title">
                        {intl.formatMessage({
                            id: 'SELECT_WALLET_TYPE',
                        })}
                    </h2>

                    {window.ObjectExt.keys(CONTRACT_TYPES).map((contractType) => {
                        if (excludedContracts?.includes(contractType)) {
                            return null
                        }

                        return (
                            <RadioButton<nt.ContractType>
                                onChange={updateWalletType}
                                id={contractType}
                                key={contractType}
                                checked={walletType === contractType}
                                label={CONTRACT_TYPES[contractType]}
                                value={contractType}
                            />
                        )
                    })}
                </div>
                <div className="select-wallet__content-buttons">
                    <Button
                        text={intl.formatMessage({ id: 'NEXT_BTN_TEXT' })}
                        onClick={() => onSubmit(walletType)}
                    />
                    {onBack && (
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            white
                            onClick={onBack}
                        />
                    )}
                    {onSkip && (
                        <Button
                            text={intl.formatMessage({ id: 'SKIP_BTN_TEXT' })}
                            white
                            onClick={onSkip}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default SelectContractType
