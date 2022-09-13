import * as React from 'react'
import { useIntl } from 'react-intl'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import {
    ContractEntry,
    CONTRACT_TYPE_NAMES,
    DEFAULT_WALLET_CONTRACTS,
    OTHER_WALLET_CONTRACTS,
} from '@shared/contracts'
import * as nt from '@nekoton'

import Button from '@popup/components/Button'
import RadioButton from '@popup/components/RadioButton'

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
                defaultContracts: makeMap(DEFAULT_WALLET_CONTRACTS),
                otherContracts: makeMap(OTHER_WALLET_CONTRACTS),
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
            defaultContracts: filterAddresses(DEFAULT_WALLET_CONTRACTS),
            otherContracts: filterAddresses(OTHER_WALLET_CONTRACTS),
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

        !availableContracts.defaultContracts.has(contractType) &&
            !availableContracts.otherContracts.has(contractType) &&
            (selectFirst(DEFAULT_WALLET_CONTRACTS, availableContracts.defaultContracts) ||
                selectFirst(OTHER_WALLET_CONTRACTS, availableContracts.otherContracts))
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
                    {DEFAULT_WALLET_CONTRACTS.map(({ type, description }) => {
                        if (excludedContracts?.includes(type)) {
                            return null
                        }

                        return (
                            <RadioButton<nt.ContractType>
                                onChange={onSelectContractType}
                                disabled={!availableContracts.defaultContracts.has(type)}
                                id={type}
                                key={type}
                                checked={type === contractType}
                                label={CONTRACT_TYPE_NAMES[type]}
                                description={intl.formatMessage({ id: description })}
                                value={type}
                            />
                        )
                    })}
                    <p className="accounts-management__content-subtitle">Other contracts:</p>
                    {OTHER_WALLET_CONTRACTS.map(({ type, description }) => {
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
                                label={CONTRACT_TYPE_NAMES[type]}
                                description={intl.formatMessage({ id: description })}
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
