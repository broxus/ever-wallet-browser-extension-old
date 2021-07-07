import * as React from 'react'

import * as nt from '@nekoton'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import { NewAccountContractType, SelectAccountAddingFlow } from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'


export enum AddAccountFlow {
	CREATE,
	IMPORT,
}

enum FlowStep {
	SELECT_FLOW,
	ENTER_ADDRESS,
	ENTER_NAME,
	SELECT_CONTRACT_TYPE,
}

export function CreateAccount(): JSX.Element {
	const accountability = useAccountability()
	const drawer = useDrawerPanel()
	const rpc = useRpc()
	const rpcState = useRpcState()

	const [address, setAddress] = React.useState('')
	const [error, setError] = React.useState<string>()
	const [flow, setFlow] = React.useState(AddAccountFlow.CREATE)
	const [inProcess, setInProcess] = React.useState(false)
	const [step, setStep] = React.useState(FlowStep.SELECT_FLOW)
	const [name, setName] = React.useState(`Account ${accountability.nextAccountId + 1}`)
	const [contractType, setContractType] = React.useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

	const onManageDerivedKey = () => {
		accountability.setStep(Step.MANAGE_DERIVED_KEY)
		drawer.setPanel(Panel.MANAGE_SEEDS)
	}

	const onSubmit = async () => {
		if (accountability.currentDerivedKey == null || inProcess) {
			return
		}

		setInProcess(true)

		try {
			await rpc.createAccount({
				contractType,
				name,
				publicKey: accountability.currentDerivedKey.publicKey,
			}).then((account) => {
				setInProcess(false)

				if (account !== undefined) {
					drawer.setPanel(Panel.MANAGE_SEEDS)
					accountability.onManageAccount(account)
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

	const onAddExisting = async () => {
		if (accountability.currentDerivedKey == null) {
			return
		}

		setInProcess(true)

		await rpc.getTonWalletInitData(address).then(async ({
			publicKey,
			contractType,
		}) => {
			await rpc.startSubscription(address, publicKey, contractType)
			const custodians = await rpc.getCustodians(address)
			await rpc.stopSubscription(address)

			if (accountability.currentDerivedKey == null) {
				return
			}

			const currentPublicKey = accountability.currentDerivedKey.publicKey
			console.log('custodians', custodians, 'account pubkey', publicKey, 'current pubkey', currentPublicKey)

			switch (true) {
				// Is deployer
				case publicKey === currentPublicKey: {
					const hasAccount = accountability.derivedKeyRelatedAccounts.some(
						(account) => account.tonWallet.address === address
					)

					if (!hasAccount) {
						console.log('address not found in derived key -> create')
						await rpc.createAccount({
							contractType,
							publicKey,
							name: `Account ${accountability.nextAccountId + 1}`,
						}).then((account) => {
							accountability.setCurrentAccount(account)
							accountability.setStep(Step.MANAGE_ACCOUNT)
							drawer.setPanel(Panel.MANAGE_SEEDS)
						})
					}
					else {
						setError('Account has already been added to the list')
					}
				} break

				case custodians.includes(currentPublicKey): {
					const hasAccount = rpcState.state?.accountEntries[publicKey]?.some(
						(account) => account.tonWallet.address === address
					)

					if (!hasAccount) {
						console.log('create and add account to externals')
						await rpc.createAccount({
							contractType,
							publicKey,
							name: `Account ${accountability.nextAccountId + 1}`,
						}).then((account) => {
							accountability.setCurrentAccount(account)
							if (currentPublicKey) {
								rpc.addExternalAccount(
									address,
									publicKey,
									currentPublicKey
								)
							}
							drawer.setPanel(Panel.MANAGE_SEEDS)
							accountability.setStep(Step.MANAGE_ACCOUNT)
						})
					}
					else {
						console.log('add to externals')
						rpc.addExternalAccount(
							address,
							publicKey,
							currentPublicKey
						)

						drawer.setPanel(Panel.MANAGE_SEEDS)
						accountability.setStep(Step.MANAGE_ACCOUNT)
					}
				} break

				// Not custodian
				case !custodians.includes(currentPublicKey): {
					setError('You are not a custodian of this account')
				}
			}

			setInProcess(false)
		}).catch((err: string) => {
			setError(err?.toString?.().replace(/Error: /gi, ''))
			setInProcess(false)
		})
	}

	const onNext = () => {
		switch (step) {
			case FlowStep.SELECT_FLOW:
				if (flow === AddAccountFlow.CREATE) {
					setStep(FlowStep.ENTER_NAME)
				}
				else if (flow === AddAccountFlow.IMPORT) {
					setStep(FlowStep.ENTER_ADDRESS)
				}
				break

			case FlowStep.ENTER_NAME:
				setStep(FlowStep.SELECT_CONTRACT_TYPE)
		}
	}

	const onBack = () => {
		switch (step) {
			case FlowStep.ENTER_NAME:
			case FlowStep.ENTER_ADDRESS:
				setStep(FlowStep.SELECT_FLOW)
				break

			case FlowStep.SELECT_CONTRACT_TYPE:
				if (flow === AddAccountFlow.CREATE) {
					setStep(FlowStep.ENTER_NAME)
				}
				else if (flow === AddAccountFlow.IMPORT) {
					setStep(FlowStep.ENTER_ADDRESS)
				}
				break

			default:
				accountability.setStep(Step.MANAGE_DERIVED_KEY)
		}
	}

	return (
		<>
			{step === FlowStep.SELECT_FLOW && (
				<SelectAccountAddingFlow
					key="selectFlow"
					flow={flow}
					onSelect={setFlow}
					onNext={onNext}
				/>
			)}

			{(step === FlowStep.ENTER_NAME || step === FlowStep.ENTER_ADDRESS) && (
				<div key="enterName" className="accounts-management__content">
					<h2 className="accounts-management__content-title">
						{step === FlowStep.ENTER_ADDRESS
							? 'Add an existing account'
							: 'Create new account'}
					</h2>

					<div className="accounts-management__content-form-rows">
						<div className="accounts-management__content-form-row">
							<Input
								name="name"
								label="Enter account name..."
								autoFocus
								type="text"
								value={name || ''}
								onChange={setName}
							/>
						</div>
						{step === FlowStep.ENTER_ADDRESS && (
							<div className="accounts-management__content-form-row">
								<Input
									name="name"
									label="Enter a multisig address..."
									autoFocus
									type="text"
									value={address || ''}
									onChange={setAddress}
								/>
							</div>
						)}
						{step === FlowStep.ENTER_NAME && (
							<div className="accounts-management__content-comment">
								There will be created new public key.
								For creating new address within an existing public key, please go to
								{' '}
								<a role="button" onClick={onManageDerivedKey}>Manage key</a>.
							</div>
						)}
					</div>

					{error !== undefined && (
						<div className="accounts-management__content-error">
							{error}
						</div>
					)}

					<div className="accounts-management__content-buttons">
						<div className="accounts-management__content-buttons-back-btn">
							<Button text="Back" white onClick={onBack} />
						</div>
						<Button
							text={step === FlowStep.ENTER_ADDRESS ? 'Add account' : 'Create account'}
							disabled={step === FlowStep.ENTER_ADDRESS ? address.length === 0 : false}
							onClick={step === FlowStep.ENTER_ADDRESS ? onAddExisting : onNext}
						/>
					</div>
				</div>
			)}

			{step === FlowStep.SELECT_CONTRACT_TYPE && (
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
