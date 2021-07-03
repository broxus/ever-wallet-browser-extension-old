import * as React from 'react'

import Button from '@popup/components/Button'


type Props = {
	seedWords: string[];
	onNext(): void;
	onBack(): void;
}

export function NewSeedPhrase({ seedWords, onNext, onBack }: Props): JSX.Element {
	return (
		<div className="accounts-management">
			<div className="accounts-management__content">
				<div>
					<h2 className="accounts-management__content-title">Save the seed phrase</h2>
					<ol>
						{seedWords?.map((word) => (
							<li key={word} className="accounts-management__content-word">
								{word.toLowerCase()}
							</li>
						))}
					</ol>
				</div>
				<div className="accounts-management__content-buttons">
					<div className="accounts-management__content-buttons-back-btn">
						<Button text="Back" white onClick={onBack} />
					</div>
					<Button text="I wrote it down on paper" onClick={onNext} />
				</div>
			</div>
		</div>
	)
}
