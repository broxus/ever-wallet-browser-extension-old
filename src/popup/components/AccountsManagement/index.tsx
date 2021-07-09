import * as React from 'react'
import classNames from 'classnames'

import * as nt from '@nekoton'
import {
	CreateAccount,
	CreateDerivedKey,
	CreateSeed,
	ManageAccount,
	ManageDerivedKey,
	ManageSeed,
} from '@popup/components/AccountsManagement/components'
import Arrow from '@popup/img/arrow.svg'
import TonLogo from '@popup/img/ton-logo.svg'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { closeCurrentWindow, useRpcState } from '@popup/providers/RpcStateProvider'
import { convertAddress } from '@shared/utils'

import './style.scss'
import Button from '@popup/components/Button'


export function ManageSeeds(): JSX.Element {
	const accountability = useAccountability()
	const rpcState = useRpcState()

	const onManageMasterKey = (seed: nt.KeyStoreEntry) => {
		return () => accountability.onManageMasterKey(seed)
	}

	const addSeed = () => {
		accountability.reset()
		accountability.setStep(Step.CREATE_SEED)
	}

	const onBackInCreateAccountIndex = () => {
		accountability.setStep(Step.MANAGE_DERIVED_KEY)
	}

	return (
		<>
			{accountability.step == Step.MANAGE_SEEDS && (
				<div key="manageSeeds" className="accounts-management__content">
					<h2 className="accounts-management__content-title">Manage seeds & subscriptions</h2>

					<div className="accounts-management__content-header">Seeds phrases</div>

					<div className="accounts-management__divider" />

					<ul className="accounts-management__list">
						{accountability.masterKeys.map((key) => {
							const isActive = accountability.selectedMasterKey === key.masterKey
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
											{accountability.masterKeysNames[key.masterKey] || convertAddress(key.masterKey)}
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

					{(rpcState.activeTab?.type === 'notification' && rpcState.group === 'manage_seeds') && (
						<div className="accounts-management__content-buttons">
							<div className="accounts-management__content-buttons-back-btn">
								<Button text="Exit" white onClick={closeCurrentWindow} />
							</div>
						</div>
					)}
				</div>
			)}

			{accountability.step === Step.CREATE_SEED && (
				<CreateSeed key="createSeed" />
			)}

			{accountability.step === Step.MANAGE_SEED && (
				<ManageSeed key="manageSeed" />
			)}

			{accountability.step === Step.CREATE_DERIVED_KEY && (
				<CreateDerivedKey key="createDerivedKey" />
			)}

			{accountability.step === Step.MANAGE_DERIVED_KEY && (
				<ManageDerivedKey key="manageDerivedKey" />
			)}

			{accountability.step === Step.CREATE_ACCOUNT && (
				<CreateAccount key="createAccount" onBackFromIndex={onBackInCreateAccountIndex} />
			)}

			{accountability.step === Step.MANAGE_ACCOUNT && (
				<ManageAccount key="manageAccount" />
			)}
		</>
	)
}
