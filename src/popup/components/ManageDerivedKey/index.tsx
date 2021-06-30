import classNames from 'classnames'
import React, { useEffect, useMemo, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'

import * as nt from '@nekoton'
import Input from '@popup/components/Input'
import UserAvatar from '@popup/components/UserAvatar'
import Arrow from '@popup/img/arrow.svg'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { convertAddress } from '@shared/utils'


import './style.scss'
import Button from '@popup/components/Button'

interface IManageDerivedKey {
	controllerRpc: IControllerRpcClient
	controllerState: ControllerState
	currentKey?: nt.KeyStoreEntry
	onCreateAccount?: () => void
	onSelectAccount?: (account: nt.AssetsList) => void
	onBack?: () => void
}

const ManageDerivedKey: React.FC<IManageDerivedKey> = ({
	controllerRpc,
	controllerState,
	currentKey,
	onCreateAccount,
	onSelectAccount,
	onBack,
}) => {
	const [name, setName] = useState(
		currentKey
			? controllerState.derivedKeysNames[currentKey.publicKey]
			: ''
	)

	const currentAccountAddress = useMemo(
		() => controllerState.selectedAccount?.tonWallet.address,
		[controllerState.selectedAccount]
	)

	const accounts = useMemo(() => {
		return currentKey ? (controllerState.accountEntries[currentKey.publicKey] || []) : []
	}, [controllerState.accountEntries])

	const onInputName = (value: string) => {
		setName(value)
	}

	const saveName = () => {
		if (currentKey) {
			controllerRpc.updateDerivedKeyName(currentKey.publicKey, name)
		}
	}

	useEffect(() => {
		if (
			currentKey !== undefined
			&& name !== controllerState.derivedKeysNames[currentKey.publicKey]
		) {
			setName(controllerState.derivedKeysNames[currentKey.publicKey])
		}
	}, [controllerState.derivedKeysNames])

	return (
		<div className="manage-derived-key__content">
			<h2 className="manage-derived-key__content-title">Manage key</h2>

			{currentKey !== undefined && (
				<>
					<div className="manage-derived-key__content-header">Public key</div>
					<CopyToClipboard
						text={currentKey.publicKey}
						onCopy={() => {
							ReactTooltip.hide()
						}}
					>
						<div
							className="manage-derived-key__public-key-placeholder"
							data-tip="Click to copy"
						>
							{currentKey.publicKey}
						</div>
					</CopyToClipboard>
					<ReactTooltip type="dark" effect="solid" place="top" />
				</>
			)}

			<div className="manage-derived-key__content-header">Key name</div>
			<div className="manage-derived-key__key-name-field">
				<Input
					name="seed_name"
					label="Enter key name"
					type="text"
					value={name}
					onChange={onInputName}
				/>
				<a
					role="button"
					className="manage-derived-key__key-name-button"
					onClick={saveName}
				>
					Save
				</a>
			</div>

			<div
				className="manage-derived-key__content-header--lead"
				style={{ fontWeight: 'bold' }}
			>
				Accounts
				<a
					role="button"
					className="manage-derived-key__create-account"
					onClick={onCreateAccount}
				>
					+ Add new
				</a>
			</div>

			<div className="manage-derived-key__content-header">My accounts</div>
			<div className="manage-derived-key__divider" />
			<ul className="manage-derived-key__list">
				{accounts.map(account => (
					<li key={account.tonWallet.address}>
						<div
							role="button"
							className={classNames('manage-seeds__list-item', {
								'manage-seeds__list-item--active': (
									currentAccountAddress === account.tonWallet.address
								)
							})}
							onClick={() => {
								onSelectAccount?.(account)
							}}
						>
							<UserAvatar address={account.tonWallet.address} small />
							<div className="manage-seeds__list-item-title">
								{account.name || convertAddress(account.tonWallet.address)}
							</div>
							<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
						</div>
					</li>
				))}
			</ul>

			<div className="manage-derived-key__content-buttons">
				<div className="manage-derived-key__content-buttons-back-btn">
					<Button text={'Back'} white onClick={onBack} />
				</div>

				{currentKey !== undefined && (
					<>
						<CopyToClipboard
							text={currentKey.publicKey}
							onCopy={() => {}}
						>
							<div
								data-tip="Copied!"
								data-event="click focus"
							>
								<Button text={'Copy public key'} />
							</div>
						</CopyToClipboard>
					</>
				)}
			</div>
		</div>
	)
}

export default ManageDerivedKey
