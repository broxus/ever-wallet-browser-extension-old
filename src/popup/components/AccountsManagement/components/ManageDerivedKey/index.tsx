import * as React from 'react'
import classNames from 'classnames'
import CopyToClipboard from 'react-copy-to-clipboard'
import ReactTooltip from 'react-tooltip'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import UserAvatar from '@popup/components/UserAvatar'
import { Step, useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { convertAddress } from '@shared/utils'

import Arrow from '@popup/img/arrow.svg'


export function ManageDerivedKey(): JSX.Element {
	const accountability = useAccountsManagement()
	const rpc = useRpc()

	const [name, setName] = React.useState(
		accountability.currentMasterKey !== undefined
			? (accountability.derivedKeysNames[accountability.currentMasterKey.publicKey] || '')
			: ''
	)

	const addAccount = () => {
		accountability.setStep(Step.CREATE_ACCOUNT)
	}

	const saveName = () => {
		if (accountability.currentDerivedKey !== undefined && name) {
			rpc.updateDerivedKeyName(accountability.currentDerivedKey.publicKey, name)
		}
	}

	const onManageAccount = (account: nt.AssetsList) => {
		return () => accountability.onManageAccount(account)
	}

	const onBack = () => {
		accountability.setStep(Step.MANAGE_SEED)
	}

	React.useEffect(() => {
		if (
			accountability.currentDerivedKey !== undefined
			&& name !== accountability.derivedKeysNames[accountability.currentDerivedKey.publicKey]
		) {
			setName(accountability.derivedKeysNames[accountability.currentDerivedKey.publicKey])
		}
	}, [accountability.derivedKeysNames])

	return (
		<div className="accounts-management__content">
			<h2 className="accounts-management__content-title">Manage key</h2>

			{accountability.currentDerivedKey !== undefined && (
				<>
					<div className="accounts-management__content-header">Public key</div>
					<CopyToClipboard
						text={accountability.currentDerivedKey.publicKey}
						onCopy={() => {
							ReactTooltip.hide()
						}}
					>
						<div
							className="accounts-management__public-key-placeholder"
							data-tip="Click to copy"
						>
							{accountability.currentDerivedKey.publicKey}
						</div>
					</CopyToClipboard>
					<ReactTooltip type="dark" effect="solid" place="top" />
				</>
			)}

			<div className="accounts-management__content-header">Key name</div>
			<div className="accounts-management__name-field">
				<Input
					name="seed_name"
					label="Enter key name"
					type="text"
					value={name || ''}
					onChange={setName}
				/>
				{(
					accountability.currentDerivedKey !== undefined
					&& (accountability.derivedKeysNames[accountability.currentDerivedKey.publicKey] !== undefined || name)
					&& accountability.derivedKeysNames[accountability.currentDerivedKey.publicKey] !== name
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

			<div className="accounts-management__content-header--lead">
				Accounts
				<a
					role="button"
					className="accounts-management__create-account"
					onClick={addAccount}
				>
					+ Add new
				</a>
			</div>

			<div className="accounts-management__content-header">My accounts</div>

			<div className="accounts-management__divider" />

			{accountability.derivedKeyRelatedAccounts.length === 0 ? (
				<div className="accounts-management__list--empty">
					No accounts yet
				</div>
			) : (
				<ul className="accounts-management__list">
					{accountability.derivedKeyRelatedAccounts.map(account => (
						<li key={account.tonWallet.address}>
							<div
								role="button"
								className={classNames('accounts-management__list-item', {
									'accounts-management__list-item--active': (
										account.tonWallet.address === accountability.selectedAccountAddress
									)
								})}
								onClick={onManageAccount(account)}
							>
								<UserAvatar
									address={account.tonWallet.address}
									className="accounts-management__list-item-icon"
									small
								/>
								<div className="accounts-management__list-item-title">
									{account.name || convertAddress(account.tonWallet.address)}
								</div>
								<div className="accounts-management__list-item-visibility">
									{accountability.accountsVisibility[account.tonWallet.address] ? 'Displayed' : 'Hidden'}
								</div>
								<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
							</div>
						</li>
					))}
				</ul>
			)}

			<div className="accounts-management__content-buttons">
				<div className="accounts-management__content-buttons-back-btn">
					<Button text="Back" white onClick={onBack} />
				</div>

				{accountability.currentDerivedKey !== undefined && (
					<div data-tip="Copied!" data-event="click focus">
						<CopyToClipboard text={accountability.currentDerivedKey.publicKey}>
							<Button text="Copy public key" />
						</CopyToClipboard>
					</div>
				)}
			</div>
		</div>
	)
}
