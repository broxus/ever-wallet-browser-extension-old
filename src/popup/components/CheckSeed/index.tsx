import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import CheckSeedInput from '../../components/CheckSeedInput/CheckSeedInput'
import Button from '../../components/Button'

import './style.scss'

interface ICheckSeed {
    onSubmit: () => void
    onBack: () => void
    seed: string[]
}

const generateRandomNumbers = () => {
    const nums = new Set<number>()
    let numArray: number[] = []

    while (nums.size !== 4) {
        nums.add(Math.floor(Math.random() * 12) + 1)
    }
    numArray = Array.from(nums).sort((a, b) => a - b)
    return numArray
}

const CheckSeed: React.FC<ICheckSeed> = ({ onSubmit, onBack, seed }) => {
    const { register, handleSubmit, errors } = useForm()

    const numbers = useMemo(() => generateRandomNumbers(), [seed])

    const validateWord = (word: string, position: number) => {
        return seed?.[position - 1] === word
    }

    return (
        <div className="exported-seed__content">
            <h2 className="exported-seed__content-title">Let’s check the seed phrase</h2>
            <form
                id="words"
                onSubmit={handleSubmit(onSubmit)}
                className="exported-seed__content-form"
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
            <div className="exported-seed__content-buttons">
                <Button text={'Confirm'} type="submit" form="words" />
                <Button text={'Back'} white onClick={onBack} />
            </div>
        </div>
    )
}

export default CheckSeed
