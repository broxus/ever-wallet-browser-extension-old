import React, { useState } from 'react'

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

    return (
        <div className="enter-password__content">
            <div className="enter-password__content-pwd-form">
                <h2 className="enter-password__content-pwd-form-header">Enter your seed phrase</h2>
                <TagsInput setWords={setWords} words={words} wordCount={wordCount} />
                <div className="words-count">{`${words.length}/${wordCount} words`}</div>
            </div>
            <div className="enter-password__content-buttons">
                <Button
                    onClick={() => onSubmit(words)}
                    text={'Confirm'}
                    disabled={words.length != wordCount}
                />
                <Button text={'Back'} white onClick={onBack} />
            </div>
        </div>
    )
}

export default EnterSeed
