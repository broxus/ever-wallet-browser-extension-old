import * as React from 'react'

import Button from '@popup/components/Button'
import { useIntl } from 'react-intl'

type Props = {
    seedWords: string[]
    onNext(): void
    onBack(): void
}

export function NewSeedPhrase({ seedWords, onNext, onBack }: Props): JSX.Element {
    const intl = useIntl()
    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">
                    {intl.formatMessage({ id: 'ADD_SEED_PANEL_SAVE_HEADER' })}
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <div className="accounts-management__content">
                    <ol>
                        {seedWords?.map((word) => (
                            <li key={word} className="accounts-management__content-word">
                                {word.toLowerCase()}
                            </li>
                        ))}
                    </ol>
                </div>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button
                            text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                            white
                            onClick={onBack}
                        />
                    </div>
                    <Button
                        text={intl.formatMessage({ id: 'WROTE_ON_PAPER_BTN_TEXT' })}
                        onClick={onNext}
                    />
                </footer>
            </div>
        </div>
    )
}
