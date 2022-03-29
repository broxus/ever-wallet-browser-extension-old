import * as React from 'react'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import CheckSeedInput from '@popup/components/CheckSeedInput'
import { shuffleArray } from '@shared/utils'
import { useIntl } from 'react-intl'

type Props = {
    seedWords: string[]
    onSubmit(): void
    onBack(): void
}

const generateRandomNumbers = () => {
    return shuffleArray(new Array(12).fill(1).map((_, i) => i + 1))
        .slice(0, 4)
        .sort((a, b) => a - b)
}

export function CheckNewSeedPhrase({ seedWords, onSubmit, onBack }: Props) {
    const intl = useIntl()
    const { register, handleSubmit, formState } = useForm()

    const numbers = React.useMemo(() => generateRandomNumbers(), [seedWords])

    const validateWord = (word: string, position: number) => {
        return seedWords?.[position - 1] === word
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">
                    {intl.formatMessage({ id: 'CHECK_THE_SEED_PHRASE' })}
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <form
                    id="words"
                    onSubmit={handleSubmit(onSubmit)}
                    className="accounts-management__content-form"
                >
                    {numbers.map((item, idx) => (
                        <CheckSeedInput
                            key={item}
                            number={item}
                            autoFocus={idx === 0}
                            {...register(`word${idx}`, {
                                required: true,
                                validate: (word: string) => validateWord(word, item),
                            })}
                        />
                    ))}
                    {(formState.errors.word0 ||
                        formState.errors.word1 ||
                        formState.errors.word2 ||
                        formState.errors.word3) && (
                        <div className="accounts-management__content-error">
                            {intl.formatMessage({ id: 'ERROR_SEED_DOES_NOT_MATCH' })}
                        </div>
                    )}
                </form>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            white
                            onClick={onBack}
                        />
                    </div>
                    <Button
                        text={intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })}
                        form="words"
                        onClick={handleSubmit(onSubmit)}
                    />
                </footer>
            </div>
        </div>
    )
}
