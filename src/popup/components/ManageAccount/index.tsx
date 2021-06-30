import React, { useMemo, useState } from 'react'
import QRCode from 'react-qr-code'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import Switcher from '@popup/components/Switcher'
import TonKey from '@popup/img/ton-key.svg'
import Arrow from '@popup/img/arrow.svg'
import { convertAddress } from '@shared/utils'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

import './style.scss'

interface IManageAccount {
	account?: nt.AssetsList
	controllerRpc: IControllerRpcClient
	controllerState: ControllerState
	onSelectKey?: (key: nt.KeyStoreEntry) => void
	onBack?: () => void
}

const ManageAccount: React.FC<IManageAccount> = ({
	account,
	controllerRpc,
	controllerState,
	onSelectKey,
	onBack,
}) => {
	const [name, setName] = useState(account ? account.name : '')

	const isVisible = useMemo(() => {
		if (account) {
			return controllerState.accountsVisibility[account.tonWallet.address]
		}
		return false
	}, [controllerState.accountsVisibility])

	const keys = useMemo(() => Object.values(controllerState.storedKeys).filter(
		key => key.publicKey === account?.tonWallet.publicKey
	), [controllerState.storedKeys])

	const onInputName = (value: string) => {
		setName(value)
	}

	const saveName = () => {
		if (account) {
			controllerRpc.updateAccountName(account, name)
		}
	}

	const onToggleVisibility = () => {
		if (account) {
			controllerRpc.updateAccountVisibility(account.tonWallet.address, !isVisible)
		}
	}

	return (
		<div className="manage-account__content">
			<h2 className="manage-account__content-title">Manage account</h2>

			<div className="manage-account__content-header">Account name</div>
			<div className="manage-account__account-name-field">
				<Input
					name="seed_name"
					label="Enter key name"
					type="text"
					value={name}
					onChange={onInputName}
				/>
				<a
					role="button"
					className="manage-account__account-name-button"
					onClick={saveName}
				>
					Save
				</a>
			</div>

			<div className="manage-account__account-visibility">
				<Switcher checked={isVisible} onChange={onToggleVisibility} />
				<span>Display on the main screen</span>
			</div>

			{account !== undefined && (
				<div className="manage-account__qr-address-placeholder">
					<div className="manage-account__qr-address-code">
						<QRCode
							value={`ton://chat/${account.tonWallet.address}`}
							size={80}
						/>
					</div>
					<div className="manage-account__qr-address-address">
						{account.tonWallet.address}
					</div>
				</div>
			)}

			{keys.length > 0 && (
				<>
					<div className="manage-account__content-header">Linked keys</div>
					<div className="manage-account__divider" />
					<ul className="manage-account__list">
						{keys.map(key => (
							<li key={key.publicKey}>
								<div
									role="button"
									className="manage-account__list-item"
									onClick={() => {
										onSelectKey?.(key)
									}}
								>
									<img src={TonKey} alt="" className="manage-account__list-item-logo" />
									<div className="manage-account__list-item-title">
										{convertAddress(key.publicKey)}
									</div>
									<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
								</div>
							</li>
						))}
					</ul>
				</>
			)}

			<div className="manage-account__content-buttons">
				<div className="manage-account__content-buttons-back-btn">
					<Button text={'Back'} white onClick={onBack} />
				</div>
				<Button text={'Go to account'} />
			</div>
		</div>
	)
}

export default ManageAccount
