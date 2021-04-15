import React from 'react'
import Button from '../Button/Button'
import CopyButton from '../CopyButton/CopyButton'

import './generate-seed.scss'

interface IExportedSeed {
    onNext: () => void
    onBack: () => void
    seed: string[]
}

const ExportedSeed: React.FC<IExportedSeed> = ({ onNext, onBack, seed }) => {
    return (
        <>
            <div className="generate-seed-page__bg" />
            <div className="generate-seed-page__content">
                <div>
                    <h2 className="generate-seed-page__content-title">Save the seed phrase</h2>
                    <ol>
                        {seed?.map((item: string, i: number) => (
                            <li key={i} className="generate-seed-page__content-word">
                                {item.toLowerCase()}
                            </li>
                        ))}
                    </ol>
                </div>
                <div className="generate-seed-page__content-buttons">
                    <Button text={'I wrote it down on paper'} onClick={onNext} />
                    <CopyButton text={seed.length ? seed?.join(' ') : ''}>
                        <Button text={'Copy all words'} white />
                    </CopyButton>
                    <Button text={'Back'} white noBorder onClick={onBack} />
                </div>
            </div>
        </>
    )
}

export default ExportedSeed
