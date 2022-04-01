import React from 'react'
import { useIntl } from 'react-intl'

import Button from '@popup/components/Button'
import { CopyButton } from '@popup/components/CopyButton'

import './style.scss'

interface IExportedSeed {
    onNext: () => void
    onBack: () => void
    seed: string[]
}

const ExportedSeed: React.FC<IExportedSeed> = ({ onNext, onBack, seed }) => {
    const intl = useIntl()
    return (
        <div className="exported-seed">
            <div className="exported-seed__content">
                <div>
                    <h2 className="exported-seed__content-title">
                        {intl.formatMessage({ id: 'SAVE_THE_SEED_PHRASE' })}
                    </h2>
                    <ol>
                        {seed?.map((item: string, i: number) => (
                            <li key={i} className="exported-seed__content-word">
                                {item.toLowerCase()}
                            </li>
                        ))}
                    </ol>
                </div>
                <br />
                <div className="exported-seed__content-buttons">
                    <Button
                        text={intl.formatMessage({ id: 'WROTE_ON_PAPER_BTN_TEXT' })}
                        onClick={onNext}
                    />
                    <CopyButton text={seed.length ? seed?.join(' ') : ''}>
                        <Button
                            text={intl.formatMessage({ id: 'COPY_ALL_WORDS_BTN_TEXT' })}
                            white
                        />
                    </CopyButton>
                    <Button
                        text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                        white
                        onClick={onBack}
                    />
                </div>
            </div>
        </div>
    )
}

export default ExportedSeed
