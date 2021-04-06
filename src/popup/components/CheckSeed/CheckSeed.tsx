import React, { Dispatch, SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import Input from '../Input/Input'
import { Button } from '../button'
import { AppState } from '../../store/app/types'
import { connect } from 'react-redux'
import './check-seed.scss'

interface ICheckSeed {
    setStep: any
    seed: string[]
}

const CheckSeed: React.FC<any> = ({ setStep, seed }) => {
    const { register, handleSubmit, errors } = useForm()

    const validateWord = (word: string, position: number) => {
        if (seed?.[position - 1] !== word) {
            return false
        }
        return true
    }

    const onSubmit = (data: any) => {
        console.log('correct')
        console.log('data', data)
    }

    return (
        <>
            <div className="check-seed__content">
                <h2 className="check-seed__content-title">Let’s check the seed phrase</h2>
                <form id="words" onSubmit={handleSubmit(onSubmit)}>
                    <Input
                        label={'4.  Enter the word'}
                        autoFocus
                        type={'text'}
                        name="word4"
                        // @ts-ignore
                        register={register({
                            required: true,
                            validate: (word: string) => validateWord(word, 4),
                        })}
                    />
                    <Input
                        label={'6.  Enter the word'}
                        type={'text'}
                        name="word6"
                        // @ts-ignore
                        register={register({
                            required: true,
                            validate: (word: string) => validateWord(word, 6),
                        })}
                    />
                    <Input
                        label={'9.  Enter the word'}
                        type={'text'}
                        name="word9"
                        // @ts-ignore
                        register={register({
                            required: true,
                            validate: (word: string) => validateWord(word, 9),
                        })}
                    />
                    <Input
                        label={'11.  Enter the word'}
                        type={'text'}
                        name="word11"
                        // @ts-ignore
                        register={register({
                            required: true,
                            validate: (word: string) => validateWord(word, 11),
                        })}
                    />
                    {(errors.word4 || errors.word6 || errors.word9 || errors.word11) && (
                        <div className="check-seed__content-error">Your seed doesn't match</div>
                    )}
                </form>
            </div>
            <div className="check-seed__buttons">
                <div className="check-seed__buttons-back-btn">
                    <Button text={'Back'} onClick={() => setStep(3)} white />
                </div>
                <Button text={'Confirm'} onClick={() => setStep(4)} type="submit" form="words" />
            </div>
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
})

export default connect(mapStateToProps, null)(CheckSeed)
