import * as React from 'react'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Step, useAccountsManagement } from '@popup/providers/AccountsManagementProvider'


export function CreateDerivedKey(): JSX.Element {
	const manager = useAccountsManagement()

	const { register, handleSubmit, errors } = useForm<{ name: string, password: string }>()

	const [error, setError] = React.useState<string>()
	const [inProcess, setInProcess] = React.useState(false)

	const onSubmit = async ({ name, password }: { name: string, password: string }) => {
		if (manager.currentMasterKey == null) {
			return
		}
		setInProcess(true)
		await manager.onCreateDerivedKey({
			accountId: manager.nextAccountId,
			masterKey: manager.currentMasterKey.masterKey,
			name,
			password,
		}).catch((err: string) => {
			try {
				setError(err?.toString?.().replace(/Error: /gi, ''))
			} catch (e) {}
		}).finally(() => {
			setInProcess(false)
		})
	}

	const onBack = () => {
		manager.setStep(Step.MANAGE_SEED)
	}

	return (
		<div className="accounts-management__content">
			<h2 className="accounts-management__content-title">Create key</h2>

			<form onSubmit={handleSubmit(onSubmit)}>
				<div className="accounts-management__content-form-rows">
					<div className="accounts-management__content-form-row">
						<Input
							name="name"
							register={register()}
							disabled={inProcess}
							label="Enter key name..."
							autoFocus
							type="text"
						/>
					</div>
					<div className="accounts-management__content-form-row">
						<Input
							name="password"
							register={register({
								required: true,
								minLength: 6,
							})}
							disabled={inProcess}
							label="Enter seed password..."
							type="password"
						/>
						{(errors.password || error) && (
							<div className="accounts-management__content-error">
								{errors.password && 'The password is required'}
								{error}
							</div>
						)}
					</div>
				</div>

				<div className="accounts-management__content-buttons">
					<div className="accounts-management__content-buttons-back-btn">
						<Button text="Back" disabled={inProcess} white onClick={onBack} />
					</div>
					<Button text="Confirm" disabled={inProcess} onClick={handleSubmit(onSubmit)} />
				</div>
			</form>
		</div>
	)
}
