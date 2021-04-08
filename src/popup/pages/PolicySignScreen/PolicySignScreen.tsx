import React, { useState } from 'react'
import Signature from '../../img/policy-sign.svg'
import { Button } from '../../components/button'
import './policy-sign.scss'
import Checkbox from '../../components/Checkbox/Checkbox'

interface IPolicySignScreen {
    setStep: (arg0: number) => void
}

const PolicySignScreen: React.FC<IPolicySignScreen> = ({ setStep }) => {
    const [checked, setChecked] = useState(false)
    return (
        <>
            <div className="policy-sign-page__bg"></div>
            <div className="policy-sign-page__illustration">
                <Signature />
            </div>
            <div className="policy-sign-page__content">
                <h2>Sign the decentralization policy to proceed</h2>
                <div className="policy-sign-page__content-checkbox">
                    <Checkbox checked={checked} setChecked={setChecked} />
                    <span className="policy-sign-page__content-checkbox-label">
                        I accept{' '}
                        <span
                            className="policy-sign-page__content-checkbox-label--link"
                            onClick={() => window.open('https://broxus.com', '_blank')}
                        >
                            the decentralization policy
                        </span>{' '}
                        of Crystal Wallet
                    </span>
                </div>
                <div>
                    <div className="policy-sign-page__content-button">
                        <Button
                            text="Submit"
                            disabled={!checked}
                            onClick={() => (checked ? setStep(2) : null)}
                        />
                    </div>
                    <Button text="Back" white onClick={() => setStep(0)} />
                </div>
            </div>
        </>
    )
}
export default PolicySignScreen
