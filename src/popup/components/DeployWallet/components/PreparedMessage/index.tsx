import * as React from 'react'

import Button from '@popup/components/Button'
import EnterPassword from '@popup/components/EnterPassword'
import SlidingPanel from '@popup/components/SlidingPanel'
import { convertTons } from '@shared/utils'


type Props = {
	balance?: string;
	custodians?: string[];
	fees?: string;
	error?: string;
	disabled?: boolean;
	onSubmit(password: string): void;
	onBack(): void;
}

export function PreparedMessage({
	balance,
	custodians,
	disabled,
	error,
	fees,
	onSubmit,
	onBack
}: Props): JSX.Element {
	const [passwordModalVisible, setPasswordModalVisible] = React.useState(false)

	const onDeploy = () => {
		setPasswordModalVisible(true)
	}

	const onCancel = () => {
		setPasswordModalVisible(false)
	}

	return (
		<>
			<h3 className="deploy-wallet__content-title">
				Funds will be debited from your balance to deploy.
			</h3>
			<div className="deploy-wallet__form-tx-details">
				<div className="deploy-wallet__form-tx-details-param">
                    <span className="deploy-wallet__form-tx-details-param-desc">
                        Account balance
                    </span>
					<span className="deploy-wallet__form-tx-details-param-value">
                        {`${convertTons(balance).toLocaleString()} TON`}
                    </span>
				</div>

				<div className="deploy-wallet__form-tx-details-param">
					<span className="deploy-wallet__form-tx-details-param-desc">Fee</span>
					<span className="deploy-wallet__form-tx-details-param-value">
	                    {fees ? `${convertTons(fees)} TON` : 'calculating...'}
	                </span>
				</div>

				{custodians?.map((custodian, idx) => (
					<div key={custodian} className="deploy-wallet__form-tx-details-param">
						<span className="deploy-wallet__form-tx-details-param-desc">
							Custodian {idx + 1}
						</span>
						<span className="deploy-wallet__form-tx-details-param-value">
		                    {custodian}
		                </span>
					</div>
				))}
			</div>

			<div className="deploy-wallet__content-buttons">
				<div className="accounts-management__content-buttons-back-btn">
					<Button text="Back" white onClick={onBack} />
				</div>
				<Button
					text="Deploy"
					disabled={!fees}
					onClick={onDeploy}
				/>
			</div>


			<SlidingPanel
				isOpen={passwordModalVisible}
				onClose={() => setPasswordModalVisible(false)}
			>
                <EnterPassword
                    disabled={disabled}
                    error={error}
                    handleNext={onSubmit}
                    handleBack={onCancel}
                />
			</SlidingPanel>
		</>
	)
}
