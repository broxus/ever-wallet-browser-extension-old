import React, { useState } from 'react'
import ConnectLedger from '@popup/components/ConnectLedger'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import * as nt from '@nekoton'

enum ConnectLedgerSteps {
    CONNECT,
    SELECT,
}

interface IConnectLedgerPage {
    controllerRpc: IControllerRpcClient
}

const ConnectLedgerPage: React.FC<IConnectLedgerPage> = ({ controllerRpc }) => {
    const [step, setStep] = useState<ConnectLedgerSteps>(ConnectLedgerSteps.CONNECT)

    const addSelectedAccounts = async (indices: number[]) => {
        for (let i = 0; i < indices.length; i++) {
            const accountId = indices[i]
            const contractType = 'SafeMultisigWallet'

            let key: nt.KeyStoreEntry | undefined
            try {
                key = await controllerRpc.createLedgerKey({
                    accountId,
                })

                await controllerRpc.createAccount({
                    name: 'Ledger ' + accountId,
                    publicKey: key.publicKey,
                    contractType,
                })
                console.log('account created')
            } catch (e) {
                key && controllerRpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
            }
        }
    }

    return (
        <>
            {step === ConnectLedgerSteps.CONNECT && (
                <ConnectLedger onNext={() => setStep(ConnectLedgerSteps.SELECT)} />
            )}
            {step === ConnectLedgerSteps.SELECT && (
                <SelectLedgerAccount
                    controllerRpc={controllerRpc}
                    onBack={() => setStep(ConnectLedgerSteps.CONNECT)}
                    onNext={addSelectedAccounts}
                />
            )}
        </>
    )
}

export default ConnectLedgerPage
