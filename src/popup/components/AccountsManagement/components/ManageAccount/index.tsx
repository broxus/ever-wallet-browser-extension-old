import * as React from 'react'
import QRCode from 'react-qr-code'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import Switcher from '@popup/components/Switcher'
import { Step, useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { convertAddress } from '@shared/utils'

import Arrow from '@popup/img/arrow.svg'
import TonKey from '@popup/img/ton-key.svg'


export function ManageAccount(): JSX.Element {
	const manager = useAccountsManagement()
	const drawer = useDrawerPanel()
	const rpc = useRpc()
	const rpcState = useRpcState()

	const [name, setName] = React.useState(
		manager.currentAccount ? manager.currentAccount.name : ''
	)

	const isVisible = React.useMemo(() => {
		if (manager.currentAccount) {
			return manager.accountsVisibility[manager.currentAccount.tonWallet.address]
		}
		return false
	}, [manager.accountsVisibility])

	const relatedKeys = React.useMemo(() => Object.values({ ...rpcState.state?.storedKeys }).filter(
		key => key.publicKey === manager.currentAccount?.tonWallet.publicKey
	), [rpcState.state?.storedKeys])

	const saveName = () => {
		if (manager.currentAccount !== undefined && name) {
			rpc.updateAccountName(manager.currentAccount, name)
			manager.setCurrentAccount({ ...manager.currentAccount, name })
		}
	}

	const onSelectAccount = async () => {
		if (manager.currentMasterKey == null) {
			return
		}

		await rpc.selectMasterKey(manager.currentMasterKey.masterKey).then(async () => {
			if (manager.currentAccount == null) {
				return
			}
			await rpc.selectAccount(manager.currentAccount.tonWallet.address).then(() => {
				drawer.setPanel(undefined)
				manager.reset()
			})
		})
	}

	const onManageDerivedKey = (key: nt.KeyStoreEntry) => {
		return () => manager.onManageDerivedKey(key)
	}

	const onToggleVisibility = () => {
		if (manager.currentAccount) {
			rpc.updateAccountVisibility(manager.currentAccount.tonWallet.address, !isVisible)
		}
	}

	const onBack = () => {
		manager.setStep(Step.MANAGE_DERIVED_KEY)
	}

	return (
		<div className="accounts-management__content">
			<h2 className="accounts-management__content-title">Manage account</h2>

			<div className="accounts-management__content-header">Account name</div>
			<div className="accounts-management__name-field">
				<Input
					name="seed_name"
					label="Enter key name"
					type="text"
					value={name}
					onChange={setName}
				/>

				{(manager.currentAccount !== undefined && manager.currentAccount.name !== name) && (
					<a
						role="button"
						className="accounts-management__name-button"
						onClick={saveName}
					>
						Save
					</a>
				)}
			</div>

			<div className="accounts-management__account-visibility">
				<Switcher checked={isVisible} onChange={onToggleVisibility} />
				<span>Display on the main screen</span>
			</div>

			{manager.currentAccount !== undefined && (
				<div className="accounts-management__qr-address-placeholder">
					<div className="accounts-management__qr-address-code">
						<QRCode
							value={`ton://chat/${manager.currentAccount.tonWallet.address}`}
							size={80}
						/>
					</div>
					<div className="accounts-management__qr-address-address">
						{manager.currentAccount.tonWallet.address}
					</div>
				</div>
			)}

			{relatedKeys.length > 0 && (
				<>
					<div className="accounts-management__content-header">Linked keys</div>
					<div className="accounts-management__divider" />
					<ul className="accounts-management__list">
						{relatedKeys.map(key => (
							<li key={key.publicKey}>
								<div
									role="button"
									className="accounts-management__list-item"
									onClick={onManageDerivedKey(key)}
								>
									<img src={TonKey} alt="" className="accounts-management__list-item-logo" />
									<div className="accounts-management__list-item-title">
										{manager.derivedKeysNames?.[key.publicKey] || convertAddress(key.publicKey)}
									</div>
									<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
								</div>
							</li>
						))}
					</ul>
				</>
			)}

			<div className="accounts-management__content-buttons">
				<div className="accounts-management__content-buttons-back-btn">
					<Button text="Back" white onClick={onBack} />
				</div>
				<Button
					text="Go to account"
					disabled={manager.selectedAccount?.tonWallet.address === manager.currentAccount?.tonWallet.address}
					onClick={onSelectAccount}
				/>
			</div>
		</div>
	)
}
