import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import TagsInput from '../TagsInput/TagsInput'
import Button from '../Button'

type IEnterSeed = {
    onSubmit: (words: string[]) => void
    onBack: () => void
    wordCount: number
}

const EnterSeed: React.FC<IEnterSeed> = ({ onSubmit, onBack, wordCount }) => {
    const [words, setWords] = useState<string[]>([])

    const { handleSubmit, errors } = useForm()

    return (
        <div className="create-password-page__content">
            <div className="create-password-page__content-pwd-form">
                <h2 className="create-password-page__content-pwd-form-header">
                    Enter your seed phrase
                </h2>
                <form id="password" onSubmit={handleSubmit(onSubmit)}>
                    <TagsInput setWords={setWords} />
                    {/*<TextareaAutosize*/}
                    {/*    autoFocus*/}
                    {/*    placeholder={'Separate words with comma or space'}*/}
                    {/*    onChange={(event: { target: { value: React.SetStateAction<string> } }) =>*/}
                    {/*        setWords(event.target.value)*/}
                    {/*    }*/}
                    {/*/>*/}
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
                    <div className="words-count">{`${words.length}/${wordCount} words`}</div>
                    {errors.pwd && (
                        <div className="check-seed__content-error">
                            The seed is required and must be minimum 6 characters long
                        </div>
                    )}
                </form>
            </div>
            <div className="create-password-page__content-buttons">
                <Button
                    text={'Confirm'}
                    disabled={words.length != wordCount}
                    type="submit"
                    form="password"
                />
                <Button text={'Back'} white onClick={onBack} />
            </div>
        </div>
    )
}

export default EnterSeed
