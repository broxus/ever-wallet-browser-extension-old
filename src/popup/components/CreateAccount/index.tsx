import React, { useState } from 'react'
import { useForm } from 'react-hook-form'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import RadioButton from '@popup/components/RadioButton'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

import './style.scss'


const CONTRACT_TYPES: { [K in nt.ContractType]: string } = {
	SafeMultisigWallet: 'SafeMultisig (default)',
	SafeMultisigWallet24h: 'SafeMultisig24',
	SetcodeMultisigWallet: 'SetcodeMultisigWallet',
	SurfWallet: 'Surf',
	WalletV3: 'WalletV3 (legacy)',
}

interface ISelectContractType {
	currentType: nt.ContractType
	excludedContracts?: nt.ContractType[]
	onSelectContractType: (type: nt.ContractType) => void
	onSubmit: () => void
	onBack?: () => void
}

const SelectContractType: React.FC<ISelectContractType> = ({
	currentType,
	excludedContracts,
	onSelectContractType,
	onSubmit,
	onBack,
}) => {
	return (
		<div className="create-account__content">
			<h2 className="create-account__content-title">Select wallet type</h2>

			{window.ObjectExt.keys(CONTRACT_TYPES).map((type) => {
				if (excludedContracts?.includes(type)) {
					return null
				}

				return (
					<RadioButton<nt.ContractType>
						onChange={onSelectContractType}
						id={type}
						key={type}
						isSelected={type === currentType}
						label={CONTRACT_TYPES[type]}
						value={type}
					/>
				)
			})}

			<div className="create-account__content-buttons">
				{onBack !== undefined && (
					<div className="create-account__content-buttons-back-btn">
						<Button text={'Back'} onClick={onBack} white />
					</div>
				)}
				<Button
					text={'Confirm'}
					onClick={onSubmit}
				/>
			</div>
		</div>
	)
}

interface ICreateAccount {
	controllerRpc: IControllerRpcClient
	currentKey?: nt.KeyStoreEntry
	onAccountCreated?: (account: nt.AssetsList) => {}
	onBack?: () => void
}

enum CreateAccountStep {
	SELECT_CONTRACT_TYPE,
	ENTER_PASSWORD,
}

const CreateAccount: React.FC<ICreateAccount> = ({
	controllerRpc,
	currentKey,
	onAccountCreated,
	onBack,
}) => {
	const [inProcess, setInProcess] = useState(false)
	const [step, setStep] = useState<CreateAccountStep | null>(null)
	const [name, setName] = useState('')
	const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)
	const [error, setError] = useState<string>()

	const onInputName = (value: string) => {
		setName(value)
	}

	const onSubmit = async () => {
		if (!currentKey || inProcess) {
			return
		}
		setInProcess(true)
		await controllerRpc.createAccount({
			name,
			publicKey: currentKey.publicKey,
			contractType,
		}).then((account) => {
			onAccountCreated?.(account)
		}).catch((err) => {
			controllerRpc.removeKey({ publicKey: currentKey.publicKey }).catch(console.error)
			setError(err.toString())
		}).finally(() => {
			setInProcess(false)
		})
	}

	return (
		<>
			{step == null && (
				<div className="create-account__content">
					<h2 className="create-account__content-title">Name your new account</h2>
					<h3 className="create-account__content-title">Choose wisely</h3>

					<div className="create-key__content-form-rows">
						<Input
							name="name"
							label={'Enter account name...'}
							autoFocus
							type={'text'}
							onChange={onInputName}
						/>

					</div>

					<div className="create-account__content-buttons">
						{onBack !== undefined && (
							<div className="create-account__content-buttons-back-btn">
								<Button text={'Back'} onClick={onBack} white />
							</div>
						)}
						<Button
							text={'Next'}
							disabled={name.length === 0}
							onClick={() => {
								setStep(CreateAccountStep.SELECT_CONTRACT_TYPE)
							}}
						/>
					</div>
				</div>
			)}
			{step === CreateAccountStep.SELECT_CONTRACT_TYPE && (
				<SelectContractType
					currentType={contractType}
					onSelectContractType={setContractType}
					onSubmit={onSubmit}
					onBack={() => {
						setStep(null)
					}}
				/>
			)}
		</>
	)
}

export default CreateAccount
