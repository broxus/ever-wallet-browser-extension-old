import React, { useState } from 'react'
import ConnectLedger from '@popup/components/ConnectLedger'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

enum ConnectLedgerSteps {
    CONNECT,
    SELECT,
}

interface IConnectLedgerPage {
    controllerRpc: IControllerRpcClient
}

const ConnectLedgerPage: React.FC<IConnectLedgerPage> = ({ controllerRpc }) => {
    const [step, setStep] = useState<ConnectLedgerSteps>(ConnectLedgerSteps.CONNECT)

    return (
        <>
            {step === ConnectLedgerSteps.CONNECT && (
                <ConnectLedger onNext={() => setStep(ConnectLedgerSteps.SELECT)} />
            )}
            {step === ConnectLedgerSteps.SELECT && (
                <SelectLedgerAccount controllerRpc={controllerRpc} />
            )}
        </>
    )
}

export default ConnectLedgerPage
