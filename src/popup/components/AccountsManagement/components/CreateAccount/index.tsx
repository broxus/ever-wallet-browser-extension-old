import * as React from 'react'

import * as nt from '@nekoton'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import { NewAccountContractType } from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Step, useAccountsManagement } from '@popup/providers/AccountsManagementProvider'


enum CreateAccountStep {
	SELECT_CONTRACT_TYPE,
}

export function CreateAccount(): JSX.Element {
	const manager = useAccountsManagement()

	const [error, setError] = React.useState<string>()
	const [inProcess, setInProcess] = React.useState(false)
	const [step, setStep] = React.useState<CreateAccountStep | null>(null)
	const [name, setName] = React.useState(`Account ${manager.nextAccountId}`)
	const [contractType, setContractType] = React.useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

	const onSubmit = async () => {
		if (manager.currentDerivedKey == null || inProcess) {
			return
		}

		setInProcess(true)
		await manager.onCreateAccount({
			name,
			publicKey: manager.currentDerivedKey.publicKey,
			contractType,
		}).catch((err: string) => {
			try {
				setError(err?.toString?.().replace(/Error: /gi, ''))
			} catch (e) {}
		}).finally(() => {
			setInProcess(false)
		})
	}

	const onNext = () => {
		setStep(CreateAccountStep.SELECT_CONTRACT_TYPE)
	}

	const onBack = () => {
		switch (step) {
			case CreateAccountStep.SELECT_CONTRACT_TYPE:
				setStep(null)
				break

			default:
				manager.setStep(Step.MANAGE_DERIVED_KEY)
		}
	}

	return (
		<>
			{step == null && (
				<div key="start" className="accounts-management__content">
					<h2 className="accounts-management__content-title">Name your new account</h2>
					<h3 className="accounts-management__content-title">Choose wisely</h3>

					<div className="create-key__content-form-rows">
						<Input
							name="name"
							label="Enter account name..."
							autoFocus
							type="text"
							value={name}
							onChange={setName}
						/>

					</div>

					<div className="accounts-management__content-buttons">
						<div className="accounts-management__content-buttons-back-btn">
							<Button text="Back" white onClick={onBack} />
						</div>
						<Button
							text="Next"
							disabled={name.length === 0}
							onClick={onNext}
						/>
					</div>
				</div>
			)}

			{step === CreateAccountStep.SELECT_CONTRACT_TYPE && (
				<NewAccountContractType
					key="accountType"
					contractType={contractType}
					error={error}
					disabled={inProcess}
					mode="create"
					onSelectContractType={setContractType}
					onSubmit={onSubmit}
					onBack={onBack}
				/>
			)}
		</>
	)
}
