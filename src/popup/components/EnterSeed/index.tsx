import React, { useState } from 'react'
import { useIntl } from 'react-intl'
import type * as nt from '@nekoton'

import TagsInput from '@popup/components/TagsInput'
import Button from '@popup/components/Button'

import './style.scss'
import { Select } from '@popup/components/Select'

type IEnterSeed = {
    onSubmit: (mnemonicType: nt.MnemonicType, phrase: string) => void
    onBack: () => void
    disabled?: boolean
}

const makeMnemonicType = (mnemonicType: nt.MnemonicType['type']): nt.MnemonicType =>
    mnemonicType === 'labs' ? { type: 'labs', accountId: 0 } : { type: 'legacy' }

type OptionType = {
    value: nt.MnemonicType['type']
    label: string
}

export const EnterSeedLogin: React.FC<IEnterSeed> = ({ onSubmit, onBack, disabled }) => {
    return (
        <div className="check-seed__wrapper">
            <EnterSeed onSubmit={onSubmit} onBack={onBack} disabled={disabled || false} />
        </div>
    )
}

const EnterSeed: React.FC<IEnterSeed> = ({ onSubmit, onBack, disabled }) => {
    const intl = useIntl()
    const [words, setWords] = useState<string[]>([])
    const [mnemonicType, setMnemonicType] = useState<nt.MnemonicType['type']>('labs')
    const mnemonicOptions = React.useMemo<OptionType[]>(
        () => [
            {
                label: '12 word phrase',
                value: 'labs',
            },
            {
                label: 'Legacy 24 word phrase',
                value: 'legacy',
            },
        ],
        []
    )

    const wordCount = mnemonicType === 'labs' ? 12 : 24

    return (
        <div className="enter-seed__content">
            <div className="enter-seed__content__seed-form">
                <h2 className="enter-seed__content__seed-form__header noselect">
                    {intl.formatMessage({ id: 'ENTER_SEED_PHRASE' })}
                </h2>
                <br />
                <Select<nt.MnemonicType['type']>
                    options={mnemonicOptions}
                    value={mnemonicType}
                    onChange={setMnemonicType}
                    className="noselect"
                    disabled={disabled}
                />
                <TagsInput
                    setWords={setWords}
                    words={words}
                    wordCount={wordCount}
                    disabled={disabled}
                />
                <div className="words-count noselect">
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
                    disabled={disabled || words.length != wordCount}
                    onClick={() => onSubmit(makeMnemonicType(mnemonicType), words.join(' '))}
                />
                <Button text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })} white onClick={onBack} />
            </div>
        </div>
    )
}

export default EnterSeed
