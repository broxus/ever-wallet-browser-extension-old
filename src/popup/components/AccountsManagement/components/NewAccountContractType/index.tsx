import { useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import * as React from 'react'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import RadioButton from '@popup/components/RadioButton'


const CONTRACT_TYPES: { [K in nt.ContractType]?: string } = {
	SafeMultisigWallet: 'SafeMultisig (default)',
	SafeMultisigWallet24h: 'SafeMultisig24',
	SetcodeMultisigWallet: 'SetcodeMultisigWallet',
	SurfWallet: 'Surf',
}

type Props = {
	contractType: nt.ContractType;
	excludedContracts?: nt.ContractType[];
	error?: string;
	disabled?: boolean;
	mode: 'create' | 'import' | 'legacy';
	onSelectContractType: (type: nt.ContractType) => void;
	onSubmit: () => void;
	onBack: () => void;
}

export function NewAccountContractType({
	contractType,
	excludedContracts,
	error,
	disabled,
	mode,
	onSelectContractType,
	onSubmit,
	onBack,
}: Props): JSX.Element {
	const manager = useAccountsManagement()

	if (mode === 'legacy') {
		CONTRACT_TYPES['WalletV3'] = 'WalletV3 (legacy)'
	}

	const availableContracts = React.useMemo(() => {
		const { currentDerivedKey } = manager
		if (currentDerivedKey == null) {
			return window.ObjectExt.keys(CONTRACT_TYPES)
		}
		const accountAddresses = manager.derivedKeyRelatedAccounts.map((account) => account.tonWallet.address)
		return window.ObjectExt.keys(CONTRACT_TYPES).filter((type) => {
			const address = nt.computeTonWalletAddress(currentDerivedKey.publicKey, type, 0)
			return !accountAddresses.includes(address)
		})
	}, [manager.derivedKeyRelatedAccounts])

	React.useEffect(() => {
		if (!availableContracts.includes(contractType)) {
			onSelectContractType(availableContracts[0])
		}
	}, [availableContracts, contractType])

	return (
		<div className="accounts-management__content">
			<h2 className="accounts-management__content-title">Select wallet type</h2>

			{window.ObjectExt.keys(CONTRACT_TYPES).map((type) => {
				if (excludedContracts?.includes(type)) {
					return null
				}

				return (
					<RadioButton<nt.ContractType>
						onChange={onSelectContractType}
						disabled={!availableContracts.includes(type)}
						id={type}
						key={type}
						checked={type === contractType}
						label={CONTRACT_TYPES[type] as string}
						value={type}
					/>
				)
			})}

			{error !== undefined && (
				<div className="accounts-management__content-error">
					{error}
				</div>
			)}

			<div className="accounts-management__content-buttons">
				<div className="accounts-management__content-buttons-back-btn">
					<Button
						text="Back"
						disabled={disabled}
						onClick={onBack}
						white
					/>
				</div>
				<Button
					text="Confirm"
					disabled={disabled}
					onClick={onSubmit}
				/>
			</div>
		</div>
	)
}
