import React, { useState } from 'react'
import LedgerConnector from '@popup/components/Ledger/LedgerConnector'
import AccountSelector from '@popup/components/Ledger/AccountSelector'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import './styles.scss'

enum ConnectLedgerSteps {
    CONNECT,
    SELECT,
}

interface IAccountManager {
    onBack: () => void;
}

const LedgerSignIn: React.FC<IAccountManager> = ({
    onBack,
}) => {
    const rpc = useRpc()
    const rpcState = useRpcState()
    const [step, setStep] = useState<ConnectLedgerSteps>(ConnectLedgerSteps.SELECT)

    const onSuccess = async () => {
        try {
            const bufferKey = await rpc.getLedgerMasterKey()
            const masterKey = Buffer.from(Object.values(bufferKey)).toString('hex')
            await rpc.selectMasterKey(masterKey)
        }
        catch (e) {
            console.error(e)
            setStep(ConnectLedgerSteps.CONNECT)
        }
    }

    return (
        <div className="ledger-sign-in">
            {step === ConnectLedgerSteps.CONNECT && (
                <LedgerConnector
                    theme="sign-in"
                    onBack={onBack}
                    onNext={() => setStep(ConnectLedgerSteps.SELECT)}
                />
            )}

            {step === ConnectLedgerSteps.SELECT && (
                <AccountSelector
                    theme="sign-in"
                    onBack={onBack}
                    onError={() => setStep(ConnectLedgerSteps.CONNECT)}
                    controllerRpc={rpc}
                    controllerState={rpcState.state}
                    onSuccess={onSuccess}
                />
            )}
        </div>
    )
}

export default LedgerSignIn
