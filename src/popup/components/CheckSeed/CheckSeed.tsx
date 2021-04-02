import React, { Dispatch, SetStateAction } from 'react'
import Input from '../Input/Input'
import { Button } from '../button'
import './check-seed.scss'
import { AppState } from '../../store/app/types'
import { connect } from 'react-redux'

interface ICheckSeed {
    setStep: Dispatch<SetStateAction<number>>
    seed: string[]
}

const CheckSeed: React.FC<ICheckSeed> = ({ setStep, seed }) => {
    return (
        <>
            <div className="check-seed__content">
                <h2 className="check-seed__content-title">Let’s check the seed phrase</h2>
                <div>
                    <Input label={'4.  Enter the word'} autoFocus type={'text'} />
                    <Input label={'7.  Enter the word'} type={'text'} />
                    <Input label={'13.  Enter the word'} type={'text'} />
                    <Input label={'16.  Enter the word'} type={'text'} />
                </div>
            </div>
            <div className="check-seed__buttons">
                <div className="check-seed__buttons-back-btn">
                    <Button text={'Back'} onClick={() => setStep(3)} white />
                </div>
                <Button text={'Confirm'} onClick={() => setStep(4)} />
            </div>
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
})

export default connect(mapStateToProps, null)(CheckSeed)
