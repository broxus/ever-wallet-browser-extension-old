import React, { useEffect, useState } from 'react'
import SelectWallet from '../SelectWallet/SelectWallet'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from '../../components/button'
import { useForm } from 'react-hook-form'
import './restore-wallet-screen.scss'

interface IRestoreWalletScreen {
    setStep: (arg0: number) => void
}

export const EnterSeedScreen: React.FC<any> = () => {
    const [words, setWords] = useState('')
    const [seed, setSeed] = useState<string[]>([])

    const { register, handleSubmit, errors, getValues } = useForm()

    useEffect(() => {
        setSeed(words?.split(/[ ,]+/).filter((el) => el !== ''))
    }, [words])

    const onSubmit = () => {
        console.log('submitted')
    }

    return (
        <div className="create-password-page__content">
            <div className="create-password-page__content-pwd-form">
                <h2 className="create-password-page__content-pwd-form-header">
                    Enter your seed phrase
                </h2>
                <form id="password" onSubmit={handleSubmit(onSubmit)}>
                    <TextareaAutosize
                        autoFocus
                        placeholder={'Separate words with comma or space'}
                        onChange={(event) => setWords(event.target.value)}
                    />

                    {/*<Input*/}
                    {/*    label={'Separate words with comma or space'}*/}
                    {/*    autoFocus*/}
                    {/*    type={'text'}*/}
                    {/*    name="seed"*/}
                    {/*    register={register({*/}
                    {/*        required: true,*/}
                    {/*        minLength: 6,*/}
                    {/*    })}*/}
                    {/*/>*/}
                    <div className="words-count">{`${seed.length}/12 words`}</div>
                    {errors.pwd && (
                        <div className="check-seed__content-error">
                            The seed is required and must be minimum 6 characters long
                        </div>
                    )}
                </form>
            </div>
            <div className="create-password-page__content-buttons">
                {/*TODO update number depending on the wallet type*/}
                <Button
                    text={'Confirm'}
                    disabled={seed.length < 12}
                    type="submit"
                    form="password"
                />
                <Button text={'Back'} white />
            </div>
        </div>
    )
}

const RestoreWalletScreen: React.FC<IRestoreWalletScreen> = ({ setStep }) => (
    <SelectWallet restore setStep={setStep} />
)

export default RestoreWalletScreen
