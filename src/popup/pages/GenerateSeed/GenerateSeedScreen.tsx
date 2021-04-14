import React, { useEffect } from 'react'
import  Button  from '../../components/Button/Button'
import CopyButton from '../../components/CopyButton/CopyButton'
import { AppState } from '../../store/app/types'
import { connect } from 'react-redux'
import { generateSeedPhrase } from '../../store/app/actions'
import Loader from '../../components/Loader/Loader'
import './generate-seed.scss'

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

interface IGenerateSeedScreen {
    seed: string[]
    generateSeedPhrase: () => void
    setStep: (arg0: number) => void
}

const GenerateSeedScreen: React.FC<IGenerateSeedScreen> = ({
    seed,
    generateSeedPhrase,
    setStep,
}) => {
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
                    {seed?.length > 0 ? (
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
                    <Button text={'I wrote it down on paper'} onClick={() => setStep(3)} />
                    <CopyButton text={seed.length ? seed?.join(',') : ''}>
                        <Button text={'Copy all words'} white />
                    </CopyButton>
                    <Button text={'Back'} white noBorder onClick={() => setStep(1)} />
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
