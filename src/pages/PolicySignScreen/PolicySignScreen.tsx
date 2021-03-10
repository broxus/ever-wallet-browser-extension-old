import React from 'react'
import Signature from '../../img/policy-sign.svg'
import { Button } from '../../components/button'
import './policy-sign.scss'

const PolicySignScreen = () => (
    <>
        <div className="policy-sign-page__bg"></div>
        <div className="policy-sign-page__illustration">
            <Signature />
        </div>
        <div className="policy-sign-page__content">
            <h2>Sign the decentralization policy to proceed</h2>
            <span className="policy-sign-page__content-checkbox">
                I accept{' '}
                <span
                    className="policy-sign-page__content-checkbox--link"
                    onClick={() => window.open('https://broxus.com', '_blank')}
                >
                    the decentralization policy
                </span>{' '}
                of Crystal Wallet
            </span>
            <div>
                <div className="policy-sign-page__content-button">
                    <Button text="Submit" />
                </div>
                <Button text="Back" white />
            </div>
        </div>
    </>
)

export default PolicySignScreen
