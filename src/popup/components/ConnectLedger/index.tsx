import React from 'react'
import Button from '@popup/components/Button'
import ConnectLedgerIcon from '@popup/img/connect-ledger.svg'

import './style.scss'

interface IConnectLedger {
    onBack?: () => void
    onNext: () => void
}

const ConnectLedger: React.FC<IConnectLedger> = ({ onBack, onNext }) => {
    return (
        <>
            <div className="connect-ledger__icon">
                <ConnectLedgerIcon />
            </div>
            <h2 className="connect-ledger__title">Connect Ledger</h2>
            <span className="connect-ledger__comment">
                Be sure that your Ledger is connected to computer and unlocked.
            </span>
            <div className="connect-ledger__buttons">
                <Button
                    className="connect-ledger__buttons-back"
                    text={'Back'}
                    disabled={false}
                    onClick={() => (onBack ? onBack() : {})}
                    white
                />
                <Button
                    className="connect-ledger__buttons-next"
                    text={'Set pairing'}
                    disabled={false}
                    onClick={() => onNext()}
                />
            </div>
        </>
    )
}

export default ConnectLedger
