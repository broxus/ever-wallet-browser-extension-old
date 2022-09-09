import * as React from 'react'
import { useIntl } from 'react-intl'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import RadioButton from '@popup/components/RadioButton'
import { useAccountability } from '@popup/providers/AccountabilityProvider'

type ContractEntry = { type: nt.ContractType; name: string; description: string }

const NEW_CONTRACTS: ContractEntry[] = [
    {
        type: 'EverWallet',
        name: 'Simple wallet',
        description: `Small wallet with one custodian. Deploys automatically.`,
    },
    {
        type: 'Multisig2',
        name: 'Multisig',
        description: 'Multisig contract with upgradable code. Requires deployment.',
    },
]

const OTHER_WALLETS: ContractEntry[] = [
    {
        type: 'SurfWallet',
        name: 'Surf wallet',
        description: 'Wallet contract used in Surf. Requires deployment.',
    },
    {
        type: 'WalletV3',
        name: 'WalletV3',
        description: 'Small legacy wallet with one custodian. Deploys automatically.',
    },
    {
        type: 'SafeMultisigWallet',
        name: 'SafeMultisig',
        description: 'Multisig contract without upgradable code. Requires deployment.',
    },
    {
        type: 'SafeMultisigWallet24h',
        name: 'SafeMultisig24h',
        description:
            'Multisig contract without upgradable code. Pending transactions lifetime extended to 24 hours. Requires deployment.',
    },
    {
        type: 'SetcodeMultisigWallet',
        name: 'SetcodeMultisig',
        description: 'Multisig contract with upgradable code. Requires deployment.',
    },
    {
        type: 'BridgeMultisigWallet',
        name: 'BridgeMultisig',
        description: 'Modified multisig. Requires deployment.',
    },
    {
        type: 'HighloadWalletV2',
        name: 'HighloadWalletV2',
        description:
            'Small legacy wallet with one custodian and advanced replay protection. Deploys automatically.',
    },
]

type Props = {
    contractType: nt.ContractType
    excludedContracts?: nt.ContractType[]
    error?: string
    disabled?: boolean
    mode: 'create' | 'import' | 'legacy'
    onSelectContractType: (type: nt.ContractType) => void
    onSubmit: () => void
    onBack: () => void
}

export function NewAccountContractType({
    contractType,
    excludedContracts,
    error,
    disabled,
    onSelectContractType,
    onSubmit,
    onBack,
}: Props): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()

    const availableContracts = React.useMemo(() => {
        const { currentDerivedKey } = accountability

        if (currentDerivedKey == null) {
            const makeMap = (entries: ContractEntry[]) =>
                entries.reduce((obj, item) => {
                    obj.set(item.type, item)
                    return obj
                }, new Map<nt.ContractType, ContractEntry>())

            return {
                newContracts: makeMap(NEW_CONTRACTS),
                otherContracts: makeMap(OTHER_WALLETS),
            }
        }

        const accountAddresses = accountability.currentDerivedKeyAccounts.map(
            (account) => account.tonWallet.address
        )

        const filterAddresses = (entries: ContractEntry[]) =>
            entries.reduce((obj, item) => {
                const address = nt.computeTonWalletAddress(
                    currentDerivedKey.publicKey,
                    item.type,
                    0
                )
                if (!accountAddresses.includes(address)) {
                    obj.set(item.type, item)
                }
                return obj
            }, new Map<nt.ContractType, ContractEntry>())

        return {
            newContracts: filterAddresses(NEW_CONTRACTS),
            otherContracts: filterAddresses(OTHER_WALLETS),
        }
    }, [accountability.currentDerivedKeyAccounts])

    React.useEffect(() => {
        const selectFirst = (
            entries: ContractEntry[],
            available: Map<nt.ContractType, ContractEntry>
        ) => {
            for (const { type } of entries) {
                if (available.has(type)) {
                    onSelectContractType(type)
                    return true
                }
            }
            return false
        }

        !availableContracts.newContracts.has(contractType) &&
            !availableContracts.otherContracts.has(contractType) &&
            (selectFirst(NEW_CONTRACTS, availableContracts.newContracts) ||
                selectFirst(OTHER_WALLETS, availableContracts.otherContracts))
    }, [availableContracts, contractType])

    return (
        <div className="accounts-management">
            <header className="accounts-management__header accounts-management__header--with-subtitles">
                <h2 className="accounts-management__header-title">
                    {intl.formatMessage({ id: 'CONTRACT_TYPE_PANEL_HEADER' })}
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <div className="accounts-management__content">
                    <p className="accounts-management__content-subtitle">Default contracts:</p>
                    {NEW_CONTRACTS.map(({ type, name, description }) => {
                        if (excludedContracts?.includes(type)) {
                            return null
                        }

                        return (
                            <RadioButton<nt.ContractType>
                                onChange={onSelectContractType}
                                disabled={!availableContracts.newContracts.has(type)}
                                id={type}
                                key={type}
                                checked={type === contractType}
                                label={name}
                                description={description}
                                value={type}
                            />
                        )
                    })}
                    <p className="accounts-management__content-subtitle">Other contracts:</p>
                    {OTHER_WALLETS.map(({ type, name, description }) => {
                        if (excludedContracts?.includes(type)) {
                            return null
                        }

                        return (
                            <RadioButton<nt.ContractType>
                                onChange={onSelectContractType}
                                disabled={!availableContracts.otherContracts.has(type)}
                                id={type}
                                key={type}
                                checked={type === contractType}
                                label={name}
                                description={description}
                                value={type}
                            />
                        )
                    })}
                    {error !== undefined && (
                        <div className="accounts-management__content-error">{error}</div>
                    )}
                </div>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            disabled={disabled}
                            white
                            onClick={onBack}
                        />
                    </div>
                    <Button
                        text={intl.formatMessage({ id: 'CREATE_ACCOUNT_BTN_TEXT' })}
                        disabled={disabled}
                        onClick={onSubmit}
                    />
                </footer>
            </div>
        </div>
    )
}
