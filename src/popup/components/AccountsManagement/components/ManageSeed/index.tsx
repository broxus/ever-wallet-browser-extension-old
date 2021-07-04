import * as React from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import { ExportSeed } from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Step, useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { convertAddress } from '@shared/utils'

import Arrow from '@popup/img/arrow.svg'
import TonKey from '@popup/img/ton-key.svg'


enum ManageSeedStep {
	EXPORT_SEED,
}

export function ManageSeed(): JSX.Element {
	const manager = useAccountsManagement()
	const rpc = useRpc()
	const rpcState = useRpcState()

	const [name, setName] = React.useState(
		manager.currentMasterKey !== undefined
			? (manager.masterKeysNames[manager.currentMasterKey.masterKey] || '')
			: ''
	)
	const [step, setStep] = React.useState<ManageSeedStep | null>(null)

	const currentDerivedKeyPubKey = React.useMemo(() => {
		if (manager.selectedAccount?.tonWallet.publicKey !== undefined) {
			return rpcState.state?.storedKeys[manager.selectedAccount.tonWallet.publicKey].publicKey
		}
		return undefined
	}, [manager.selectedAccount, rpcState.state?.storedKeys])

	const addKey = () => {
		manager.setStep(Step.CREATE_DERIVED_KEY)
	}

	const saveName = () => {
		if (manager.currentMasterKey !== undefined && name) {
			rpc.updateMasterKeyName(manager.currentMasterKey.masterKey, name)
		}
	}

	const onManageDerivedKey = (key: nt.KeyStoreEntry) => {
		return () => manager.onManageDerivedKey(key)
	}

	const onExportSeed = async () => {
		setStep(ManageSeedStep.EXPORT_SEED)
	}

	const onBack = () => {
		switch (step) {
			case ManageSeedStep.EXPORT_SEED:
				setStep(null)
				break

			default:
				manager.reset()
				manager.setStep(null)
		}
	}

	React.useEffect(() => {
		if (
			manager.currentMasterKey !== undefined
			&& name !== manager.masterKeysNames[manager.currentMasterKey.masterKey]
		) {
			setName(manager.masterKeysNames[manager.currentMasterKey.masterKey])
		}
	}, [manager.masterKeysNames])

	return (
		<>
			{step == null && (
				<div key="start" className="accounts-management__content">
					<h2 className="accounts-management__content-title">Manage seed phrase</h2>

					<div className="accounts-management__content-header">Seed name</div>
					<div className="accounts-management__name-field">
						<Input
							name="seed_name"
							label="Enter seed name"
							type="text"
							value={name || ''}
							onChange={setName}
						/>
						{(
							manager.currentMasterKey !== undefined
							&& (manager.masterKeysNames[manager.currentMasterKey.masterKey] !== undefined || name)
							&& manager.masterKeysNames[manager.currentMasterKey.masterKey] !== name
						) && (
							<a
								role="button"
								className="accounts-management__name-button"
								onClick={saveName}
							>
								Save
							</a>
						)}
					</div>

					<div className="accounts-management__content-header" style={{ marginTop: 16 }}>Keys</div>

					<div className="accounts-management__divider" />

					<ul className="accounts-management__list">
						{manager.derivedKeys.map(key => {
							const isActive = currentDerivedKeyPubKey === key.publicKey
							return (
								<li key={key.publicKey}>
									<div
										role="button"
										className={classNames('accounts-management__list-item', {
											'accounts-management__list-item--active': isActive
										})}
										onClick={onManageDerivedKey(key)}
									>
										<img src={TonKey} alt="" className="accounts-management__list-item-logo" />
										<div className="accounts-management__list-item-title">
											{manager.derivedKeysNames[key.publicKey] || convertAddress(key.publicKey)}
										</div>
										<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
									</div>
								</li>
							)
						})}
						<li>
							<div className="accounts-management__list-item">
								<a role="button" onClick={addKey}>+ Add new</a>
							</div>
						</li>
					</ul>

					<div className="accounts-management__content-buttons">
						<div className="accounts-management__content-buttons-back-btn">
							<Button text="Back" white onClick={onBack} />
						</div>
						<Button text="Export seed" onClick={onExportSeed} />
					</div>
				</div>
			)}

			{step === ManageSeedStep.EXPORT_SEED && (
				<ExportSeed key="exportSeed" onBack={onBack} />
			)}
		</>
	)
}
