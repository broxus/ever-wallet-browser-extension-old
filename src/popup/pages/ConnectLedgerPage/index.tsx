import React, { useState } from 'react'
import ConnectLedger from '@popup/components/ConnectLedger'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import * as nt from '@nekoton'

enum ConnectLedgerSteps {
    CONNECT,
    SELECT,
}

interface IConnectLedgerPage {
    controllerRpc: IControllerRpcClient,
    controllerState: ControllerState
}

const ConnectLedgerPage: React.FC<IConnectLedgerPage> = ({ controllerRpc, controllerState }) => {
    const [step, setStep] = useState<ConnectLedgerSteps>(ConnectLedgerSteps.CONNECT)

    return (
        <>
            {step === ConnectLedgerSteps.CONNECT && (
                <ConnectLedger onNext={() => setStep(ConnectLedgerSteps.SELECT)} />
            )}
            {step === ConnectLedgerSteps.SELECT && (
                <SelectLedgerAccount
                    controllerRpc={controllerRpc}
                    onBack={() => setStep(ConnectLedgerSteps.CONNECT)}
                    controllerState={controllerState}
                />
            )}
        </>
    )
}

export default ConnectLedgerPage
