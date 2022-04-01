import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useIntl } from 'react-intl'
import { shuffleArray } from '@shared/utils'

import CheckSeedInput from '@popup/components/CheckSeedInput'
import Button from '@popup/components/Button'

import './style.scss'

interface ICheckSeed {
    onSubmit: () => void
    onBack: () => void
    seed: string[]
}

const generateRandomNumbers = () => {
    return shuffleArray(new Array(12).fill(1).map((_, i) => i + 1))
        .slice(0, 4)
        .sort((a, b) => a - b)
}

export const CheckSeedOnCreation: React.FC<ICheckSeed> = ({ onSubmit, onBack, seed }) => {
    return (
        <div className="check-seed__wrapper">
            <CheckSeed onSubmit={onSubmit} onBack={onBack} seed={seed} />
        </div>
    )
}

const CheckSeed: React.FC<ICheckSeed> = ({ onSubmit, onBack, seed }) => {
    const intl = useIntl()
    const { register, handleSubmit, formState } = useForm()

    const numbers = useMemo(() => generateRandomNumbers(), [seed])

    const validateWord = (word: string, position: number) => {
        return seed?.[position - 1] === word
    }

    return (
        <div className="check-seed__content">
            <div>
                <h2 className="check-seed__content-title">
                    {intl.formatMessage({ id: 'CHECK_THE_SEED_PHRASE' })}
                </h2>
                <form
                    id="words"
                    onSubmit={handleSubmit(onSubmit)}
                    className="check-seed__content-form"
                >
                    {numbers.map((item: number, i: number) => {
                        return (
                            <CheckSeedInput
                                key={i}
                                number={item}
                                autoFocus={i === 0}
                                {...register(`word${i}`, {
                                    required: true,
                                    validate: (word: string) => validateWord(word, item),
                                })}
                            />
                        )
                    })}
                    {(formState.errors.word0 ||
                        formState.errors.word1 ||
                        formState.errors.word2 ||
                        formState.errors.word3) && (
                        <div className="check-seed__content-error">
                            {intl.formatMessage({ id: 'ERROR_SEED_DOES_NOT_MATCH' })}
                        </div>
                    )}
                </form>
            </div>
            <div className="check-seed__content-buttons">
                <Button
                    text={intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })}
                    onClick={handleSubmit(onSubmit)}
                    form="words"
                />
                <Button text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })} white onClick={onBack} />
            </div>
        </div>
    )
}

export default CheckSeed
