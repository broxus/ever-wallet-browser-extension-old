import * as React from 'react'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'


export function CreateDerivedKey(): JSX.Element {
	const accountability = useAccountability()
	const rpc = useRpc()

	const { register, handleSubmit, errors } = useForm<{ name: string | undefined, password: string }>()

	const [error, setError] = React.useState<string>()
	const [inProcess, setInProcess] = React.useState(false)

	const onSubmit = async ({ name, password }: { name: string | undefined, password: string }) => {
		if (accountability.currentMasterKey == null) {
			return
		}

		setInProcess(true)

		name = name !== undefined ? name.trim() : name;
		name = name === '' ? undefined : name;

		try {
			await rpc.createDerivedKey({
				accountId: accountability.nextAccountId,
				masterKey: accountability.currentMasterKey.masterKey,
				name,
				password,
			}).then((derivedKey) => {
				setInProcess(false)

				if (derivedKey !== undefined) {
					accountability.onManageDerivedKey(derivedKey)
				}
			}).catch((err: string) => {
				setError(err?.toString?.().replace(/Error: /gi, ''))
				setInProcess(false)
			})
		}
		catch (e) {
			setError(e.toString().replace(/Error: /gi, ''))
			setInProcess(false)
		}
	}

	const onBack = () => {
		accountability.setStep(Step.MANAGE_SEED)
	}

	return (
		<div className="accounts-management">
			<header className="accounts-management__header">
				<h2 className="accounts-management__header-title">
					Create key
				</h2>
			</header>

			<div className="accounts-management__wrapper">
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
							<div className="accounts-management__content-form-row-hint">
								<sup>*</sup> Will be generated automatically
							</div>
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
				</form>

				<footer className="accounts-management__footer">
					<div className="accounts-management__footer-button-back">
						<Button text="Back" disabled={inProcess} white onClick={onBack} />
					</div>
					<Button text="Confirm" disabled={inProcess} onClick={handleSubmit(onSubmit)} />
				</footer>
			</div>
		</div>
	)
}
