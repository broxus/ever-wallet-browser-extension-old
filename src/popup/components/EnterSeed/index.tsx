import React, { useState } from 'react'
import { useForm } from 'react-hook-form'

import TagsInput from '@components/TagsInput'
import Button from '@components/Button'

type IEnterSeed = {
    onSubmit: (words: string[]) => void
    onBack: () => void
    wordCount: number
}

const EnterSeed: React.FC<IEnterSeed> = ({ onSubmit, onBack, wordCount }) => {
    const [words, setWords] = useState<string[]>([])

    const { handleSubmit, errors } = useForm()

    return (
        <div className="enter-password__content">
            <div className="enter-password__content-pwd-form">
                <h2 className="enter-password__content-pwd-form-header">Enter your seed phrase</h2>
                <form id="password" onSubmit={handleSubmit(() => onSubmit(words))}>
                    <TagsInput setWords={setWords} />
                    <div className="words-count">{`${words.length}/${wordCount} words`}</div>
                    {errors.pwd && (
                        <div className="check-seed__content-error">
                            The seed is required and must be minimum 6 characters long
                        </div>
                    )}
                </form>
            </div>
            <div className="enter-password__content-buttons">
                <Button
                    text={'Confirm'}
                    disabled={words.length != wordCount}
                    onClick={handleSubmit(onSubmit)}
                    form="password"
                />
                <Button text={'Back'} white onClick={onBack} />
            </div>
        </div>
    )
}

export default EnterSeed
