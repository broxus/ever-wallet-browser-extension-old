import React, { useState } from 'react'
import LedgerConnector from '@popup/components/Ledger/LedgerConnector'
import AccountSelector from '@popup/components/Ledger/AccountSelector'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

enum ConnectLedgerSteps {
    CONNECT,
    SELECT,
}

interface IAccountManager {
    name?: string;
    onBack: () => void;
}

const AccountManager: React.FC<IAccountManager> = ({
    onBack, name,
}) => {
    const rpc = useRpc()
    const rpcState = useRpcState()
    const [step, setStep] = useState<ConnectLedgerSteps>(ConnectLedgerSteps.SELECT)

    const onSuccess = async () => {
        try {
            if (name) {
                const bufferKey = await rpc.getLedgerMasterKey()
                const masterKey = Buffer.from(Object.values(bufferKey)).toString('hex')
                await rpc.updateMasterKeyName(masterKey, name)
            }

            onBack()
        }
        catch (e) {
            console.error(e)
            setStep(ConnectLedgerSteps.CONNECT)
        }
    }

    return (
        <>
            {step === ConnectLedgerSteps.CONNECT && (
                <LedgerConnector
                    onBack={onBack}
                    onNext={() => setStep(ConnectLedgerSteps.SELECT)}
                />
            )}

            {step === ConnectLedgerSteps.SELECT && (
                <AccountSelector
                    controllerRpc={rpc}
                    controllerState={rpcState.state}
                    onBack={onBack}
                    onSuccess={onSuccess}
                    onError={() => setStep(ConnectLedgerSteps.CONNECT)}
                />
            )}
        </>
    )
}

export default AccountManager
