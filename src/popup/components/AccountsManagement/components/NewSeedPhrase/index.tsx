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
			<header className="accounts-management__header">
				<h2 className="accounts-management__header-title">
					Save the seed phrase
				</h2>
			</header>

			<div className="accounts-management__wrapper">
				<div className="accounts-management__content">
					<ol>
						{seedWords?.map((word) => (
							<li key={word} className="accounts-management__content-word">
								{word.toLowerCase()}
							</li>
						))}
					</ol>
				</div>

				<footer className="accounts-management__footer">
					<div className="accounts-management__footer-button-back">
						<Button text="Back" white onClick={onBack} />
					</div>
					<Button text="I wrote it down on paper" onClick={onNext} />
				</footer>
			</div>
		</div>
	)
}
