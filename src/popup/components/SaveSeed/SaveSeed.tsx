import React, { Dispatch, SetStateAction, useEffect, Validator } from 'react'
import Loader from '../Loader/Loader'
import { connect } from 'react-redux'
import { generateSeed } from '../../store/app/actions'
import { AppState } from '../../store/app/types'
import './save-seed.scss'
import Button from '../Button/Button'

interface ISaveSeed {
    setStep: Dispatch<SetStateAction<number>>
    seed: string[]
    generateSeed: () => Promise<void>
}

const SaveSeed: React.FC<ISaveSeed> = ({ setStep, seed, generateSeed }) => {
    const generateSeed = async () => {
        await generateSeed()
    }

    useEffect(() => {
        generateSeed()
    }, [])

    return (
        <div className="save-seed">
            <div className="save-seed__content">
                <h2 className="save-seed__content-title">Save the seed phrase</h2>
                {seed.length > 0 ? (
                    <>
                        <ol>
                            {seed?.map((item: string, i: number) => (
                                <li key={i} className="save-seed__content-word">
                                    {item.toLowerCase()}
                                </li>
                            ))}
                        </ol>
                    </>
                ) : (
                    <Loader />
                )}
            </div>
            <div className="save-seed__buttons">
                <div className="save-seed__buttons-back-btn">
                    <Button text={'Back'} onClick={() => setStep(2)} white />
                </div>
                <Button text={'I wrote it down on paper'} onClick={() => setStep(4)} />
            </div>
        </div>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
})

export default connect(mapStateToProps, {
    generateSeed,
})(SaveSeed)
