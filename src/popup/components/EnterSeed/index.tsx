import React, { useState } from 'react'
import { useIntl } from 'react-intl'

import TagsInput from '@popup/components/TagsInput'
import Button from '@popup/components/Button'

import './style.scss'

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
    const intl = useIntl()
    const [words, setWords] = useState<string[]>([])

    return (
        <div className="enter-seed__content">
            <div className="enter-seed__content__seed-form">
                <h2 className="enter-seed__content__seed-form__header">
                    {intl.formatMessage({ id: 'ENTER_SEED_PHRASE' })}
                </h2>
                <TagsInput setWords={setWords} words={words} wordCount={wordCount} />
                <div className="words-count">
                    {intl.formatMessage(
                        { id: 'ENTER_SEED_PHRASE_WORDS_COUNTER' },
                        {
                            value: words.length,
                            limit: wordCount,
                        }
                    )}
                </div>
            </div>
            <br />
            <div className="enter-seed__buttons">
                <Button
                    text={intl.formatMessage({ id: 'CONFIRM_BTN_TEXT' })}
                    disabled={words.length != wordCount}
                    onClick={() => onSubmit(words)}
                />
                <Button text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })} white onClick={onBack} />
            </div>
        </div>
    )
}

export default EnterSeed
