import React, { useEffect, useState } from 'react'
import { Button } from '../../components/button'
import CopyButton from '../../components/CopyButton/CopyButton'
import Input from '../../components/Input/Input'
import { AppState } from '../../store/app/types'
import { connect } from 'react-redux'
import { generateSeedPhrase } from '../../store/app/actions'
import Loader from '../../components/Loader/Loader'
import './generate-seed.scss'
import CheckSeedInput from '../../components/CheckSeedInput/CheckSeedInput'
import { useForm } from 'react-hook-form'

const words = [
    'Secure',
    'Lovely',
    'Flower',
    'Eleven',
    'Dexpa',
    'Биток',
    'Unique',
    'Test',
    'Vova',
    'Vanya',
    'Dasha',
    'Word',
    'Twelve',
    'March',
    'Some other',
    'Poem',
    'Finance',
    'Generic',
    'Twenty',
    'Sing',
    'Lonely',
    'Sad',
    'Dolphin',
    'Nicola',
]

const generateMockSeed = () => Array.from(words.sort(() => 0.5 - Math.random()))

interface ICheckSeed {
    seed: string
}
export const CheckSeed: React.FC<ICheckSeed> = ({ seed }) => {
    const { register, handleSubmit, errors } = useForm()

    const validateWord = (word: string, position: number) => {
        if (seed?.[position - 1] !== word) {
            return false
        }
        return true
    }

    const nums = new Set()
    let numArray: number[] = []
    while (nums.size !== 4) {
        // TODO modify values here depending on the wallet type
        nums.add(Math.floor(Math.random() * 12) + 1)
        // @ts-ignore
        numArray = Array.from(nums).sort((a, b) => a - b)
    }

    const onSubmit = (data: any) => {
        console.log('data', data)
    }

    return (
        <div className="generate-seed-page__content">
            <h2>Let’s check the seed phrase</h2>
            <form id="words" onSubmit={handleSubmit(onSubmit)}>
                {numArray.map((item: number, i: number) => (
                    <CheckSeedInput
                        number={item}
                        autoFocus={i === 0}
                        name={`word${i}`}
                        register={register({
                            required: true,
                            validate: (word: string) => validateWord(word, item),
                        })}
                    />
                ))}

                {/*<CheckSeedInput*/}
                {/*    number={4}*/}
                {/*    autoFocus={true}*/}
                {/*    name="word0"*/}
                {/*    register={register({*/}
                {/*        required: true,*/}
                {/*        validate: (word: string) => validateWord(word, 4),*/}
                {/*    })}*/}
                {/*/>*/}
                {/*<CheckSeedInput*/}
                {/*    number={7}*/}
                {/*    name="word1"*/}
                {/*    register={register({*/}
                {/*        required: true,*/}
                {/*        validate: (word: string) => validateWord(word, 4),*/}
                {/*    })}*/}
                {/*/>*/}
                {/*<CheckSeedInput*/}
                {/*    number={13}*/}
                {/*    name="word2"*/}
                {/*    register={register({*/}
                {/*        required: true,*/}
                {/*        validate: (word: string) => validateWord(word, 4),*/}
                {/*    })}*/}
                {/*/>*/}
                {/*<CheckSeedInput*/}
                {/*    number={16}*/}
                {/*    name="word3"*/}
                {/*    register={register({*/}
                {/*        required: true,*/}
                {/*        validate: (word: string) => validateWord(word, 4),*/}
                {/*    })}*/}
                {/*/>*/}
                {(errors.word0 || errors.word1 || errors.word2 || errors.word3) && (
                    <div className="check-seed__content-error">Your seed doesn't match</div>
                )}
            </form>
            <div className="generate-seed-page__content-check-seed-buttons">
                <Button text={'Confirm'} />
                <Button text={'Back'} white />
            </div>
        </div>
    )
}

const GenerateSeedScreen: React.FC<any> = ({ seed, generateSeedPhrase }) => {
    const generateSeed = async () => {
        await generateSeedPhrase()
    }

    useEffect(() => {
        generateSeed()
    }, [])

    // const mockSeed = generateMockSeed()

    return (
        <>
            <div className="generate-seed-page__bg"></div>
            <div className="generate-seed-page__content">
                <div>
                    <h2 className="generate-seed-page__content-title">Save the seed phrase</h2>
                    {seed.length > 0 ? (
                        <>
                            <ol>
                                {seed?.map((item: string, i: number) => (
                                    <li key={i} className="generate-seed-page__content-word">
                                        {item.toLowerCase()}
                                    </li>
                                ))}
                            </ol>
                        </>
                    ) : (
                        <Loader />
                    )}
                </div>
                <div className="generate-seed-page__content-buttons">
                    <Button text={'I wrote it down on paper'} />
                    <CopyButton text={seed?.join(',')}>
                        <Button text={'Copy all words'} white />
                    </CopyButton>
                    <Button text={'Back'} white noBorder />
                </div>
            </div>
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
})

export default connect(mapStateToProps, {
    generateSeedPhrase,
})(GenerateSeedScreen)
