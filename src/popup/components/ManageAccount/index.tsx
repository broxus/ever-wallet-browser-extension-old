import React, { useMemo, useState } from 'react'
import QRCode from 'react-qr-code'

import * as nt from '@nekoton'
import Input from '@popup/components/Input'
import Switcher from '@popup/components/Switcher'

import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

import './style.scss'

interface IManageAccount {
	account?: nt.AssetsList
	controllerRpc: IControllerRpcClient
	controllerState: ControllerState
}

const ManageAccount: React.FC<IManageAccount> = ({
	account,
	controllerRpc,
	controllerState,
}) => {
	const [name, setName] = useState(
		account
			? account.name
			: ''
	)

	const isVisible = useMemo(() => {
		if (account) {
			return controllerState.accountsVisibility[account.tonWallet.address]
		}
		return false
	}, [controllerState.accountsVisibility])

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
			controllerRpc.updateAccountName(account.tonWallet.address, !isVisible)
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
		</div>
	)
}

export default ManageAccount
