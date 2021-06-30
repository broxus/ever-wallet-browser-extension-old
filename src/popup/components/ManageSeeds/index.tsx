import React, { useMemo, useState } from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import CreateAccount from '@popup/components/CreateAccount'
import ManageAccount from '@popup/components/ManageAccount'
import CreateSeed from '@popup/components/CreateSeed'
import ManageSeed from '@popup/components/ManageSeed'
import CreateDerivedKey from '@popup/components/CreateDerivedKey'
import ManageDerivedKey from '@popup/components/ManageDerivedKey'
import Arrow from '@popup/img/arrow.svg'
import TonLogo from '@popup/img/ton-logo.svg'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { convertAddress } from '@shared/utils'

import './style.scss'


interface IManageSeeds {
	controllerRpc: IControllerRpcClient
	controllerState: ControllerState
}

enum ManageSeedsStep {
	MANAGE_SEED,
	CREATE_SEED,
	MANAGE_DERIVED_KEY,
	CREATE_DERIVED_KEY,
	MANAGE_ACCOUNT,
	CREATE_ACCOUNT,
}

const ManageSeeds: React.FC<IManageSeeds> = ({ controllerRpc, controllerState  }) => {
	const [step, setStep] = useState<ManageSeedsStep | null>(null)
	const [currentSeed, setCurrentSeed] = useState<nt.KeyStoreEntry>()
	const [currentKey, setCurrentKey] = useState<nt.KeyStoreEntry>()
	const [currentAccount, setCurrentAccount] = useState<nt.AssetsList>()

	const selectedSeedMasterKey = useMemo(() => {
		if (controllerState.selectedAccount?.tonWallet.publicKey !== undefined) {
			return controllerState.storedKeys[controllerState.selectedAccount?.tonWallet.publicKey].masterKey
		}
		return undefined
	}, [controllerState.selectedAccount])
	const seeds = useMemo(() => Object.values(controllerState.storedKeys).filter(
		key => key.accountId === 0
	), [controllerState.storedKeys])
	const nextAccountId = useMemo(() => {
		const ids = Object.values(controllerState.storedKeys).map(({ accountId }) => accountId)
		return Math.max(...ids) + 1
	}, [controllerState.storedKeys])

	const onSeedCreated = (createdSeed: nt.KeyStoreEntry) => {
		setCurrentSeed(createdSeed)
		setStep(ManageSeedsStep.MANAGE_SEED)
	}

	const onCreateDerivedKey = () => {
		setStep(ManageSeedsStep.CREATE_DERIVED_KEY)
	}

	const onDerivedKeyCreated = (createdDerivedKey: nt.KeyStoreEntry) => {
		setCurrentKey(createdDerivedKey)
		setStep(ManageSeedsStep.MANAGE_DERIVED_KEY)
	}

	return (
		<>
			{step == null && (
				<div className="manage-seeds__content">
					<h2 className="manage-seeds__content-title">Manage seeds & subscriptions</h2>

					<div className="manage-seeds__content-header">Seeds phrases</div>

					<div className="manage-seeds__divider" />

					<ul className="manage-seeds__list">
						{seeds.map(seed => {
							const isActive = selectedSeedMasterKey === seed.masterKey
							return (
								<li key={seed.masterKey}>
									<div
										role="button"
										className={classNames('manage-seeds__list-item', {
											'manage-seeds__list-item--active': isActive
										})}
										onClick={() => {
											setCurrentSeed(seed)
											setStep(ManageSeedsStep.MANAGE_SEED)
										}}
									>
										<img src={TonLogo} alt="" className="manage-seeds__list-item-logo" />
										<div className="manage-seeds__list-item-title">
											{controllerState.seedsNames?.[seed.masterKey] || convertAddress(seed.masterKey)}
											{isActive && ' (current)'}
										</div>
										<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
									</div>
								</li>
							)
						})}
						<li>
							<div className="manage-seeds__list-item">
								<a
									role="button"
									onClick={() => {
										setStep(ManageSeedsStep.CREATE_SEED)
									}}
								>
									+ Add new
								</a>
							</div>
						</li>
					</ul>
				</div>
			)}
			{step === ManageSeedsStep.CREATE_SEED && (
				<CreateSeed
					controllerRpc={controllerRpc}
					onSeedCreated={onSeedCreated}
					onBack={() => {
						setStep(null)
					}}
				/>
			)}
			{step === ManageSeedsStep.MANAGE_SEED && (
				<ManageSeed
					controllerRpc={controllerRpc}
					controllerState={controllerState}
					currentSeed={currentSeed}
					onCreateKey={onCreateDerivedKey}
					onSelectKey={(key) => {
						setCurrentKey(key)
						setStep(ManageSeedsStep.MANAGE_DERIVED_KEY)
					}}
				/>
			)}
			{step === ManageSeedsStep.CREATE_DERIVED_KEY && (
				<CreateDerivedKey
					controllerRpc={controllerRpc}
					controllerState={controllerState}
					seed={currentSeed}
					nextAccountId={nextAccountId}
					onKeyCreated={onDerivedKeyCreated}
					onBack={() => {
						setStep(ManageSeedsStep.MANAGE_SEED)
					}}
				/>
			)}
			{step === ManageSeedsStep.MANAGE_DERIVED_KEY && (
				<ManageDerivedKey
					controllerRpc={controllerRpc}
					controllerState={controllerState}
					currentKey={currentKey}
					onCreateAccount={() => {
						setStep(ManageSeedsStep.CREATE_ACCOUNT)
					}}
					onSelectAccount={(account) => {
						setCurrentAccount(account)
						setStep(ManageSeedsStep.MANAGE_ACCOUNT)
					}}
				/>
			)}
			{step === ManageSeedsStep.CREATE_ACCOUNT && (
				<CreateAccount
					controllerRpc={controllerRpc}
					currentKey={currentKey}
					onAccountCreated={(account) => {
						setCurrentAccount(account)
						setStep(ManageSeedsStep.MANAGE_ACCOUNT)
					}}
					onBack={() => {
						setStep(ManageSeedsStep.MANAGE_DERIVED_KEY)
					}}
				/>
			)}
			{step === ManageSeedsStep.MANAGE_ACCOUNT && (
				<ManageAccount
					account={currentAccount}
					controllerRpc={controllerRpc}
					controllerState={controllerState}
				/>
			)}
		</>
	)
}

export default ManageSeeds
