import React, { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import Input from '@popup/components/Input'
import Arrow from '@popup/img/arrow.svg'
import TonKey from '@popup/img/ton-key.svg'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { convertAddress } from '@shared/utils'

import './style.scss'

interface IManageSeed {
	controllerRpc: IControllerRpcClient
	controllerState: ControllerState
	currentSeed?: nt.KeyStoreEntry
	onCreateKey?: () => void
	onSelectKey?: (key: nt.KeyStoreEntry) => void
}

const ManageSeed: React.FC<IManageSeed> = ({
	controllerState,
	controllerRpc,
	currentSeed,
	onCreateKey,
	onSelectKey,
}) => {
	const [name, setName] = useState(
		currentSeed
			? controllerState.seedsNames[currentSeed.masterKey]
			: ''
	)

	const currentDerivedKeyPublicKey = useMemo(() => {
		if (controllerState.selectedAccount?.tonWallet.publicKey !== undefined) {
			return controllerState.storedKeys[controllerState.selectedAccount?.tonWallet.publicKey].publicKey
		}
		return undefined
	}, [controllerState.selectedAccount])

	const keys = useMemo(() => Object.values(controllerState.storedKeys).filter(
		key => key.masterKey === currentSeed?.masterKey
	), [controllerState.storedKeys])

	const onInputName = (value: string) => {
		setName(value)
	}

	const saveName = () => {
		if (currentSeed) {
			controllerRpc.updateSeedName(currentSeed.masterKey, name)
		}
	}

	useEffect(() => {
		if (
			currentSeed !== undefined
			&& name !== controllerState.seedsNames[currentSeed.masterKey]
		) {
			setName(controllerState.seedsNames[currentSeed.masterKey])
		}
	}, [controllerState.seedsNames])

	return (
		<div className="manage-seeds__content">
			<h2 className="manage-seeds__content-title">Manage seed phrase</h2>

			<div className="manage-seeds__content-header">Seed name</div>
			<div className="manage-seeds__seed-name-field">
				<Input
					name="seed_name"
					label="Enter seed name"
					type="text"
					value={name}
					onChange={onInputName}
				/>
				<a
					role="button"
					className="manage-seeds__seed-name-button"
					onClick={saveName}
				>
					Save
				</a>
			</div>

			<div className="manage-seeds__content-header" style={{ marginTop: 16 }}>Keys</div>
			<div className="manage-seeds__divider" />
			<ul className="manage-seeds__list">
				{keys.map(key => {
					const isActive = currentDerivedKeyPublicKey === key.publicKey
					return (
						<li key={key.publicKey}>
							<div
								role="button"
								className={classNames('manage-seeds__list-item', {
									'manage-seeds__list-item--active': isActive
								})}
								onClick={() => {
									onSelectKey?.(key)
								}}
							>
								<img src={TonKey} alt="" className="manage-seeds__list-item-logo" />
								<div className="manage-seeds__list-item-title">
									{controllerState.derivedKeysNames?.[key.publicKey] || convertAddress(key.publicKey)}
									{isActive && ' (current)'}
								</div>
								<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
							</div>
						</li>
					)
				})}
				<li>
					<div className="manage-seeds__list-item">
						<a role="button" onClick={onCreateKey}>
							+ Add new
						</a>
					</div>
				</li>
			</ul>
		</div>
	)
}

export default ManageSeed
