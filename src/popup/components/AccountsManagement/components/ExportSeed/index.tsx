import * as React from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { useForm } from 'react-hook-form'
import ReactTooltip from 'react-tooltip'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { useRpc } from '@popup/providers/RpcProvider'


type Props = {
	onBack(): void;
}

enum ExportSeedStep {
	COPY_SEED_PHRASE,
	SEED_PHRASE_COPIED,
}

export function ExportSeed({ onBack }: Props): JSX.Element {
	const manager = useAccountsManagement()
	const rpc = useRpc()

	const { register, handleSubmit, errors } = useForm<{ password: string }>()

	const [error, setError] = React.useState<string>()
	const [inProcess, setInProcess] = React.useState(false)
	const [seedPhrase, setSeedPhrase] = React.useState<string[]>()
	const [step, setStep] = React.useState<ExportSeedStep | null>(null)

	const onCopy = () => {
		setStep(ExportSeedStep.SEED_PHRASE_COPIED)
	}

	const onSubmit = async ({ password }: { password: string }) => {
		if (manager.currentMasterKey == null) {
			return
		}
		setInProcess(true)
		await rpc.exportMasterKey({
			type: 'master_key',
			data: {
				masterKey: manager.currentMasterKey.masterKey,
				password,
			}
		}).then(({ phrase }) => {
			setSeedPhrase(phrase.split(' '))
			setStep(ExportSeedStep.COPY_SEED_PHRASE)
		}).catch((err: string) => {
			try {
				setError(err?.toString?.().replace(/Error: /gi, ''))
			} catch (e) {}
		}).finally(() => {
			setInProcess(false)
		})
	}

	return (
		<>
			{step == null && (
				<div key="start" className="accounts-management__content">
					<h2 className="accounts-management__content-title">Export a seed phrase</h2>

					<form onSubmit={handleSubmit(onSubmit)}>
						<div className="accounts-management__content-form-rows">
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

					<div className="accounts-management__content-buttons">
						<div className="accounts-management__content-buttons-back-btn">
							<Button text="Back" white onClick={onBack} />
						</div>
						<Button text="Confirm" onClick={handleSubmit(onSubmit)} />
					</div>
				</div>
			)}

			{(step !== null && [ExportSeedStep.COPY_SEED_PHRASE, ExportSeedStep.SEED_PHRASE_COPIED].includes(step)) && (
				<div key="copySeedPhrase" className="accounts-management__content">
					<h2 className="accounts-management__content-title">Save the seed phrase</h2>

					<ol>
						{seedPhrase?.map((item) => (
							<li key={item} className="accounts-management__content-word">
								{item.toLowerCase()}
							</li>
						))}
					</ol>

					<div className="accounts-management__content-buttons">
						<div className="accounts-management__content-buttons-back-btn">
							<Button text="Back" white onClick={onBack} />
						</div>
						<div data-tip="Copied!" data-event="click focus">
							{step === ExportSeedStep.COPY_SEED_PHRASE && (
								<CopyToClipboard
									text={seedPhrase?.length ? seedPhrase.join(' ') : ''}
									onCopy={onCopy}
								>
									<Button text="Copy all words" />
								</CopyToClipboard>
							)}
							{step === ExportSeedStep.SEED_PHRASE_COPIED && (
								<Button text="I save it down" onClick={onBack} />
							)}
							<ReactTooltip type="dark" effect="solid" place="top" />
						</div>
					</div>
				</div>
			)}
		</>
	)
}
