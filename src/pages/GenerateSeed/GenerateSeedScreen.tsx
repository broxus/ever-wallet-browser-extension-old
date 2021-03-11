import React from 'react'
import './generate-seed.scss'
import { Button } from '../../components/button'

const words = [
    'Secure',
    'Lovely',
    'Flower',
    'Eleven',
    'Dexpa',
    'Биток',
    'Unique',
    'Test',
    'Vova',
    'Vanya',
    'Dasha',
    'Word',
    'Twelve',
    'March',
    'Some other',
    'Poem',
    'Finance',
    'Generic',
    'Twenty',
    'Sing',
    'Lonely',
    'Sad',
    'Dolphin',
    'Nicola',
]

const generateMockSeed = () => Array.from(words.sort(() => 0.5 - Math.random()))

const GenerateSeedScreen = () => {
    return (
        <>
            <div className="generate-seed-page__bg"></div>
            <div className="generate-seed-page__content">
                <h2>Save the seed phrase</h2>
                <ol>
                    {generateMockSeed().map((item: string, i: number) => (
                        <li key={i} className="generate-seed-page__content-word">
                            {item.toLowerCase()}
                        </li>
                    ))}
                </ol>
                <div className="generate-seed-page__content-buttons">
                    <Button text={'I wrote it down on paper'} />
                    <Button text={'Copy all words'} white />
                    <Button text={'Back'} white noBorder />
                </div>
            </div>
        </>
    )
}

export default GenerateSeedScreen
