import * as React from 'react'

import {
    MultisigData,
    MultisigForm,
    PreparedMessage,
} from '@popup/components/DeployWallet/components'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { closeCurrentWindow, useRpcState } from '@popup/providers/RpcStateProvider'
import { prepareKey } from '@popup/utils'
import { DeployMessageToPrepare, WalletMessageToSend } from '@shared/backgroundApi'

enum Step {
    ENTER_DATA,
    DEPLOY_MESSAGE,
}

export function DeployMultisigWallet(): JSX.Element {
    const accountability = useAccountability()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [multisigData, setMultisigData] = React.useState<MultisigData>()
    const [inProcess, setInProcess] = React.useState(false)
    const [error, setError] = React.useState<string>()
    const [fees, setFees] = React.useState<string>()
    const [step, setStep] = React.useState(Step.ENTER_DATA)

    const selectedDerivedKeyEntry = React.useMemo(() => {
        return accountability.selectedAccountPublicKey !== undefined
            ? rpcState.state?.storedKeys[accountability.selectedAccountPublicKey]
            : undefined
    }, [accountability.selectedAccountPublicKey])

    const sendMessage = (message: WalletMessageToSend) => {
        if (accountability.selectedAccountAddress == null) {
            return
        }
        rpc.sendMessage(accountability.selectedAccountAddress, message)
        closeCurrentWindow()
    }

    const onSubmit = async (password: string) => {
        if (selectedDerivedKeyEntry == null || accountability.selectedAccountAddress == null) {
            return
        }

        const keyPassword = prepareKey(selectedDerivedKeyEntry, password)
        const params: DeployMessageToPrepare = {
            type: 'multiple_owners',
            custodians: multisigData?.custodians || [],
            reqConfirms: parseInt((multisigData?.reqConfirms as unknown) as string) || 0,
        }

        setError(undefined)
        setInProcess(true)

        await rpc
            .prepareDeploymentMessage(accountability.selectedAccountAddress, params, keyPassword)
            .then((signedMessage) => {
                sendMessage({ signedMessage, info: { type: 'deploy', data: undefined } })
                setInProcess(false)
            })
            .catch((err) => {
                setError(err.toString())
                setInProcess(false)
            })
    }

    const onNext = (data: MultisigData) => {
        setMultisigData(data)
        setStep(Step.DEPLOY_MESSAGE)
    }

    const onBack = () => {
        setStep(Step.ENTER_DATA)
    }

    React.useEffect(() => {
        if (
            accountability.selectedAccountAddress == null ||
            accountability.tonWalletState == null ||
            accountability.tonWalletState?.isDeployed
        ) {
            return
        }

        rpc.estimateDeploymentFees(accountability.selectedAccountAddress)
            .then((fees) => {
                setFees(fees)
            })
            .catch(console.error)
    }, [accountability.selectedAccountAddress, accountability.tonWalletState])

    return (
        <div className="deploy-wallet">
            <header className="deploy-wallet__header">
                <h2 className="deploy-wallet__header-title">Deploy your wallet</h2>
                {step === Step.DEPLOY_MESSAGE && (
                    <h3 className="deploy-wallet__header-subtitle">
                        Funds will be debited from your balance to deploy.
                    </h3>
                )}
            </header>
            {(() => {
                switch (step) {
                    case Step.DEPLOY_MESSAGE:
                        return (
                            <PreparedMessage
                                balance={accountability.tonWalletState?.balance}
                                fees={fees}
                                custodians={multisigData?.custodians}
                                disabled={inProcess}
                                error={error}
                                onSubmit={onSubmit}
                                onBack={onBack}
                            />
                        )

                    default:
                        return <MultisigForm key="multisig" data={multisigData} onSubmit={onNext} />
                }
            })()}
        </div>
    )
}
