import * as React from 'react'

import Button from '@popup/components/Button'
import { EnterPassword } from '@popup/components/EnterPassword'
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
		<div className="deploy-wallet__wrapper">
			<div className="deploy-wallet__details">
				<div className="deploy-wallet__details-param">
                    <span className="deploy-wallet__details-param-desc">
                        Account balance
                    </span>
					<span className="deploy-wallet__details-param-value">
                        {`${convertTons(balance).toLocaleString()} TON`}
                    </span>
				</div>

				<div className="deploy-wallet__details-param">
					<span className="deploy-wallet__details-param-desc">Fee</span>
					<span className="deploy-wallet__details-param-value">
	                    {fees ? `${convertTons(fees)} TON` : 'calculating...'}
	                </span>
				</div>

				{custodians?.map((custodian, idx) => (
					<div key={custodian} className="deploy-wallet__details-param">
						<span className="deploy-wallet__details-param-desc">
							Custodian {idx + 1}
						</span>
						<span className="deploy-wallet__details-param-value">
		                    {custodian}
		                </span>
					</div>
				))}
			</div>

			<footer className="deploy-wallet__footer">
				<div className="deploy-wallet__footer-button-back">
					<Button text="Back" white onClick={onBack} />
				</div>
				<Button
					text="Deploy"
					disabled={!fees}
					onClick={onDeploy}
				/>
			</footer>


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
		</div>
	)
}
