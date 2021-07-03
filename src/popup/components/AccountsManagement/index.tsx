import * as React from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import {
	CreateAccount,
	CreateDerivedKey,
	CreateSeed, ManageAccount,
	ManageDerivedKey,
	ManageSeed,
} from '@popup/components/AccountsManagement/components'
import Arrow from '@popup/img/arrow.svg'
import TonLogo from '@popup/img/ton-logo.svg'
import { Step, useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { convertAddress } from '@shared/utils'

import './style.scss'


export function ManageSeeds(): JSX.Element {
	const manager = useAccountsManagement()

	const onManageMasterKey = (seed: nt.KeyStoreEntry) => {
		return () => manager.onManageMasterKey(seed)
	}

	const addSeed = () => {
		manager.setStep(Step.CREATE_SEED)
	}

	return (
		<>
			{manager.step == null && (
				<div key="start" className="accounts-management__content">
					<h2 className="accounts-management__content-title">Manage seeds & subscriptions</h2>

					<div className="accounts-management__content-header">Seeds phrases</div>

					<div className="accounts-management__divider" />

					<ul className="accounts-management__list">
						{manager.masterKeys.map((key) => {
							const isActive = manager.selectedMasterKey === key.masterKey
							return (
								<li key={key.masterKey}>
									<div
										role="button"
										className={classNames('accounts-management__list-item', {
											'accounts-management__list-item--active': isActive
										})}
										onClick={onManageMasterKey(key)}
									>
										<img src={TonLogo} alt="" className="accounts-management__list-item-logo" />
										<div className="accounts-management__list-item-title">
											{manager.masterKeysNames[key.masterKey] || convertAddress(key.masterKey)}
											{isActive && ' (current)'}
										</div>
										<img src={Arrow} alt="" style={{ height: 24, width: 24 }} />
									</div>
								</li>
							)
						})}
						<li>
							<div className="accounts-management__list-item">
								<a role="button" onClick={addSeed}>+ Add new</a>
							</div>
						</li>
					</ul>
				</div>
			)}

			{manager.step === Step.CREATE_SEED && (
				<CreateSeed key="createSeed" />
			)}

			{manager.step === Step.MANAGE_SEED && (
				<ManageSeed key="manageSeed" />
			)}

			{manager.step === Step.CREATE_DERIVED_KEY && (
				<CreateDerivedKey key="createDerivedKey" />
			)}

			{manager.step === Step.MANAGE_DERIVED_KEY && (
				<ManageDerivedKey key="manageDerivedKey" />
			)}

			{manager.step === Step.CREATE_ACCOUNT && (
				<CreateAccount key="createAccount" />
			)}

			{manager.step === Step.MANAGE_ACCOUNT && (
				<ManageAccount key="manageAccount" />
			)}
		</>
	)
}
