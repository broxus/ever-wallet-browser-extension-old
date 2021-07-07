import * as React from 'react'
import classNames from 'classnames'
import Select from 'react-select'

import Button from '@popup/components/Button'
import { AddAccountFlow } from '@popup/components/AccountsManagement/components'
import { selectStyles } from '@popup/constants/selectStyle'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { convertAddress } from '@shared/utils'


const CreateAccountIcon = ({ className }: { className?: string }) => {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M19.9122 0L11 8.91221V13H15.0878L24 4.08779L19.9122 0ZM14.319 11.4H12.6V9.68097L19.8809 2.40002L21.6 4.11907L14.319 11.4ZM4 5H3V6V20V21H4H18H19V20V15H17V19H5V7H9V5H4Z"
				fill="currentColor"
			/>
		</svg>

	)
}

const PlusIcon = ({ className }: { className?: string }) => {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
			<path fillRule="evenodd" clipRule="evenodd" d="M10 0H8V8H0V10H8V18H10V10H18V8H10V0Z" fill="currentColor" />
		</svg>
	)
}

type Props = {
	flow: AddAccountFlow,
	onSelect(flow: AddAccountFlow): void;
	onNext(): void;
}

type OptionType = {
	label: string;
	value: string;
}

export function SelectAccountAddingFlow({ flow, onSelect, onNext }: Props): JSX.Element {
	const accountability = useAccountability()

	const derivedKeysOptions = React.useMemo<OptionType[]>(
		() => accountability.derivedKeys.map((derivedKey) => ({
			label: accountability.derivedKeysNames[derivedKey.publicKey] || convertAddress(derivedKey.publicKey),
			value: derivedKey.publicKey,
		})),
		[accountability.derivedKeys]
	)

	const [selectedDerivedKey, setDerivedKey] = React.useState<OptionType | null>(derivedKeysOptions[0])

	const onChange = (flow: AddAccountFlow) => {
		return () => {
			onSelect(flow)
		}
	}

	React.useEffect(() => {
		const derivedKey = accountability.derivedKeys.find((key) => key.publicKey === selectedDerivedKey?.value)
		if (derivedKey !== undefined) {
			accountability.setCurrentDerivedKey(derivedKey)
		}
	}, [selectedDerivedKey])

	return (
		<div className="accounts-management__content">
			<h2 className="accounts-management__content-title">Add account</h2>

			<div className="accounts-management__content-form-rows">
				<div className="accounts-management__content-form-row">
					<Select
						options={derivedKeysOptions}
						value={selectedDerivedKey}
						styles={selectStyles}
						onChange={setDerivedKey}
					/>
				</div>
			</div>

			<div className="accounts-management__add-options">
				<div
					className={classNames('accounts-management__add-options-option', {
						'accounts-management__add-options-option-selected': flow === AddAccountFlow.CREATE,
					})}
					onClick={onChange(AddAccountFlow.CREATE)}
				>
					<CreateAccountIcon className="accounts-management__add-options-icon" />
					Create new account
				</div>
				<div
					className={classNames('accounts-management__add-options-option', {
						'accounts-management__add-options-option-selected': flow === AddAccountFlow.IMPORT,
					})}
					onClick={onChange(AddAccountFlow.IMPORT)}
				>
					<PlusIcon className="accounts-management__add-options-icon" />
					Add an existing account
				</div>
			</div>

			<div className="accounts-management__content-buttons">
				<Button text="Next" onClick={onNext} />
			</div>
		</div>
	)
}
