import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { shuffleArray } from '@utils'

import CheckSeedInput from '@components/CheckSeedInput'
import Button from '@components/Button'

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
    const { register, handleSubmit, errors } = useForm()

    const numbers = useMemo(() => generateRandomNumbers(), [seed])

    const validateWord = (word: string, position: number) => {
        return seed?.[position - 1] === word
    }

    return (
        <div className="check-seed__content">
            <div>
                <h2 className="check-seed__content-title">Let’s check the seed phrase</h2>
                <form
                    id="words"
                    onSubmit={handleSubmit(onSubmit)}
                    className="check-seed__content-form"
                >
                    {numbers.map((item: number, i: number) => (
                        <CheckSeedInput
                            key={i}
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
            <div className="check-seed__content-buttons">
                <Button text={'Confirm'} onClick={handleSubmit(onSubmit)} form="words" />
                <Button text={'Back'} white onClick={onBack} />
            </div>
        </div>
    )
}

export default CheckSeed
