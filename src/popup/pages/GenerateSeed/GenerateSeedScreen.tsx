import React, { useEffect, useState } from 'react'
import { Button } from '../../components/button'
import CopyButton from '../../components/CopyButton/CopyButton'
import Input from '../../components/Input/Input'
import { AppState } from '../../store/app/types'
import { connect } from 'react-redux'
import { generateSeedPhrase } from '../../store/app/actions'
import Loader from '../../components/Loader/Loader'
import './generate-seed.scss'
import CheckSeedInput from '../../components/CheckSeedInput/CheckSeedInput'

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

export const CheckSeed = () => (
    <div className="generate-seed-page__content">
        <h2>Let’s check the seed phrase</h2>
        <div>
            <CheckSeedInput number={4} autoFocus={true}/>
            <CheckSeedInput number={7} />
            <CheckSeedInput number={13} />
            <CheckSeedInput number={16} />
        </div>
        <div className="generate-seed-page__content-check-seed-buttons">
            <Button text={'Confirm'} />
            <Button text={'Back'} white noBorder />
        </div>
    </div>
)

const GenerateSeedScreen: React.FC<any> = ({ seed, generateSeedPhrase }) => {
    const generateSeed = async () => {
        await generateSeedPhrase()
    }

    useEffect(() => {
        generateSeed()
    }, [])

    // const mockSeed = generateMockSeed()

    return (
        <>
            <div className="generate-seed-page__bg"></div>
            <div className="generate-seed-page__content">
                <div>
                    <h2 className="generate-seed-page__content-title">Save the seed phrase</h2>
                    {seed.length > 0 ? (
                        <>
                            <ol>
                                {seed?.map((item: string, i: number) => (
                                    <li key={i} className="generate-seed-page__content-word">
                                        {item.toLowerCase()}
                                    </li>
                                ))}
                            </ol>
                        </>
                    ) : (
                        <Loader />
                    )}
                </div>
                <div className="generate-seed-page__content-buttons">
                    <Button text={'I wrote it down on paper'} />
                    <CopyButton text={seed?.join(',')}>
                        <Button text={'Copy all words'} white />
                    </CopyButton>
                    <Button text={'Back'} white noBorder />
                </div>
            </div>
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
})

export default connect(mapStateToProps, {
    generateSeedPhrase,
})(GenerateSeedScreen)
