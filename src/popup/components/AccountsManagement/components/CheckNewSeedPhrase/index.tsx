import * as React from 'react'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import CheckSeedInput from '@popup/components/CheckSeedInput'
import { shuffleArray } from '@shared/utils'


type Props = {
	seedWords: string[];
	onSubmit(): void;
	onBack(): void;
}

const generateRandomNumbers = () => {
	return shuffleArray(new Array(12).fill(1).map((_, i) => i + 1))
		.slice(0, 4)
		.sort((a, b) => a - b)
}

export function CheckNewSeedPhrase({ seedWords, onSubmit, onBack }: Props) {
	const { register, handleSubmit, errors } = useForm()

	const numbers = React.useMemo(() => generateRandomNumbers(), [seedWords])

	const validateWord = (word: string, position: number) => {
		return seedWords?.[position - 1] === word
	}

	return (
		<div className="accounts-management__content">
			<div>
				<h2 className="accounts-management__content-title">Let’s check the seed phrase</h2>
				<form
					id="words"
					onSubmit={handleSubmit(onSubmit)}
					className="check-seed__content-form"
				>
					{numbers.map((item: number, i: number) => (
						<CheckSeedInput
							key={item}
							number={item}
							autoFocus={i === 0}
							name={`word${i}`}
							register={register({
								required: true,
								validate: (word: string) => validateWord(word, item),
							})}
						/>
					))}
					{(errors.word0 || errors.word1 || errors.word2 || errors.word3) && (
						<div className="check-seed__content-error">Your seed doesn't match</div>
					)}
				</form>
			</div>

			<div className="accounts-management__content-buttons">
				<div className="accounts-management__content-buttons-back-btn">
					<Button text="Back" white onClick={onBack} />
				</div>
				<Button text="Confirm" form="words" onClick={handleSubmit(onSubmit)} />
			</div>
		</div>
	)
}
