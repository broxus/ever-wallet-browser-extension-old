import React from 'react'

import Button from '@popup/components/Button'
import CopyButton from '@popup/components/CopyButton'

import './style.scss'

interface IExportedSeed {
    onNext: () => void
    onBack: () => void
    seed: string[]
}

const ExportedSeed: React.FC<IExportedSeed> = ({ onNext, onBack, seed }) => {
    return (
        <div className="exported-seed">
            {/*<div className="exported-seed__bg" />*/}
            <div className="exported-seed__content">
                <div>
                    <h2 className="exported-seed__content-title">Save the seed phrase</h2>
                    <ol>
                        {seed?.map((item: string, i: number) => (
                            <li key={i} className="exported-seed__content-word">
                                {item.toLowerCase()}
                            </li>
                        ))}
                    </ol>
                </div>
                <div className="exported-seed__content-buttons">
                    <Button text={'I wrote it down on paper'} onClick={onNext} />
                    <CopyButton text={seed.length ? seed?.join(' ') : ''}>
                        <Button text={'Copy all words'} white />
                    </CopyButton>
                    <Button text={'Back'} white onClick={onBack} />
                </div>
            </div>
        </div>
    )
}

export default ExportedSeed
