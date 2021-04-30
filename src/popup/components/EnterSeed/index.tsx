import React, { useState } from 'react'
import { useForm } from 'react-hook-form'

import TagsInput from '@popup/components/TagsInput'
import Button from '@popup/components/Button'

type IEnterSeed = {
    onSubmit: (words: string[]) => void
    onBack: () => void
    wordCount: number
}

export const EnterSeedLogin: React.FC<IEnterSeed> = ({ onSubmit, onBack, wordCount }) => {
    return (
        <div className="check-seed__wrapper">
            <EnterSeed onSubmit={onSubmit} onBack={onBack} wordCount={wordCount} />
        </div>
    )
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
