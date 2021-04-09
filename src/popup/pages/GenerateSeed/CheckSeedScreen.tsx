import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import CheckSeedInput from '../../components/CheckSeedInput/CheckSeedInput'
import { Button } from '../../components/button'
import { AppState } from '../../store/app/types'
import { connect } from 'react-redux'

interface ICheckSeed {
    setStep: (arg0: number) => void
    seed: string[]
}

const generateRandomNumbers = () => {
    const nums = new Set()
    let numArray: number[] = []
    while (nums.size !== 4) {
        // TODO modify values here depending on the wallet type
        nums.add(Math.floor(Math.random() * 12) + 1)
        // @ts-ignore
        numArray = Array.from(nums).sort((a, b) => a - b)
    }
    return numArray
}

const CheckSeedScreen: React.FC<ICheckSeed> = ({ setStep, seed }) => {
    const { register, handleSubmit, errors } = useForm()

    const numbers = useMemo(() => generateRandomNumbers(), [seed])

    const validateWord = (word: string, position: number) => {
        if (seed?.[position - 1] !== word) {
            return false
        }
        return true
    }

    const onSubmit = () => {
        setStep(4)
    }

    return (
        <div className="generate-seed-page__content">
            <h2>Let’s check the seed phrase</h2>
            <form
                id="words"
                onSubmit={handleSubmit(onSubmit)}
                className="generate-seed-page__content-form"
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
            <div className="generate-seed-page__content-check-seed-buttons">
                <Button text={'Confirm'} type="submit" form="words" />
                <Button text={'Back'} white onClick={() => setStep(2)} />
            </div>
        </div>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
})

export default connect(mapStateToProps)(CheckSeedScreen)
