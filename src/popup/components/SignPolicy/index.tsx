import React, { useState } from 'react'

import Button from '@popup/components/Button'
import Checkbox from '@popup/components/Checkbox'

import Signature from '@popup/img/policy-sign.svg'

import './style.scss'

interface ISignPolicy {
    onSubmit: () => void
    onBack: () => void
}

const SignPolicy: React.FC<ISignPolicy> = ({ onSubmit, onBack }) => {
    const [checked, setChecked] = useState(false)

    return (
        <div className="policy-sign-page">
            <div className="policy-sign-page__illustration" />
            <div className="policy-sign-page__content noselect">
                <h2>Sign the decentralization policy to proceed</h2>
                <Signature />
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
                            onClick={() => (checked ? onSubmit() : null)}
                        />
                    </div>
                    <Button text="Back" white onClick={() => onBack()} />
                </div>
            </div>
        </div>
    )
}

export default SignPolicy
