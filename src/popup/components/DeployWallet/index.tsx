import * as React from 'react'
import Decimal from 'decimal.js'
import QRCode from 'react-qr-code'

import * as nt from '@nekoton'
import { NATIVE_CURRENCY } from '@shared/constants'
import { useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { parseError, prepareKey } from '@popup/utils'
import { getScrollWidth } from '@popup/utils/getScrollWidth'
import { DeployMessageToPrepare, WalletMessageToSend } from '@shared/backgroundApi'
import { convertTons } from '@shared/utils'

import Button from '@popup/components/Button'
import { Select } from '@popup/components/Select'
import { CopyButton } from '@popup/components/CopyButton'
import { PreparedMessage } from '@popup/components/DeployWallet/components'

import './style.scss'

enum DeployWalletStep {
    SELECT_TYPE,
    DEPLOY_MESSAGE,
}

enum DeployWalletType {
    STANDARD,
    MULTISIG,
}

type OptionType = {
    value: DeployWalletType
    label: string
}

const walletTypesOptions: OptionType[] = [
    { label: 'Standard wallet', value: DeployWalletType.STANDARD },
    { label: 'Multi-signature wallet', value: DeployWalletType.MULTISIG },
]

export function DeployWallet(): JSX.Element | null {
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [inProcess, setInProcess] = React.useState(false)
    const [error, setError] = React.useState<string>()
    const [fees, setFees] = React.useState<string>()
    const [step, setStep] = React.useState(DeployWalletStep.SELECT_TYPE)
    const [walletType, setWalletType] = React.useState<OptionType | null>(walletTypesOptions[0])

    const selectedAccount = React.useMemo(() => rpcState.state.selectedAccount?.tonWallet, [])
    if (selectedAccount == null) {
        return null
    }

    const scrollWidth = React.useMemo(() => getScrollWidth(), [])

    const selectedDerivedKeyEntry = React.useMemo(() => {
        return selectedAccount.publicKey !== undefined
            ? rpcState.state.storedKeys[selectedAccount.publicKey]
            : undefined
    }, [rpcState, selectedAccount])

    const tonWalletState = React.useMemo(() => {
        return rpcState.state.accountContractStates[selectedAccount.address] as
            | nt.ContractState
            | undefined
    }, [rpcState, selectedAccount])

    const sendMessage = (message: WalletMessageToSend) => {
        rpc.sendMessage(selectedAccount.address, message)
        drawer.setPanel(undefined)
    }

    const onChangeWalletType = (_: DeployWalletType, option: any) => {
        setWalletType(option)
    }

    const onSubmit = async (password: string) => {
        if (selectedDerivedKeyEntry == null) {
            return
        }

        const keyPassword = prepareKey(selectedDerivedKeyEntry, password, {
            address: selectedAccount.address,
            amount: '0',
        })
        const params: DeployMessageToPrepare = { type: 'single_owner' }

        setError(undefined)
        setInProcess(true)

        await rpc
            .prepareDeploymentMessage(selectedAccount.address, params, keyPassword)
            .then((signedMessage) => {
                sendMessage({ signedMessage, info: { type: 'deploy', data: undefined } })
            })
            .catch((e) => {
                setError(parseError(e))
            })
            .finally(() => {
                setInProcess(false)
            })
    }

    const onNext = async () => {
        if (walletType?.value === DeployWalletType.MULTISIG) {
            await rpc.openExtensionInExternalWindow({
                group: 'deploy_multisig_wallet',
                width: 360 + scrollWidth - 1,
                height: 600 + scrollWidth - 1,
            })
            drawer.setPanel(undefined)
            return
        }

        switch (step) {
            case DeployWalletStep.SELECT_TYPE:
                setStep(DeployWalletStep.DEPLOY_MESSAGE)
                break

            default:
                setStep(DeployWalletStep.SELECT_TYPE)
        }
    }

    const onBack = () => {
        setStep(DeployWalletStep.SELECT_TYPE)
    }

    React.useEffect(() => {
        if (tonWalletState == null || tonWalletState?.isDeployed) {
            return
        }

        rpc.estimateDeploymentFees(selectedAccount.address)
            .then((fees) => {
                setFees(fees)
            })
            .catch(console.error)
    }, [tonWalletState, selectedAccount])

    const balance = new Decimal(tonWalletState?.balance || '0')
    const totalAmount = Decimal.max(
        '100000000',
        new Decimal('10000000').add(fees || '0')
    ).toString()

    if (balance.greaterThanOrEqualTo(totalAmount)) {
        return (
            <div className="deploy-wallet">
                <header className="deploy-wallet__header">
                    <h2 className="deploy-wallet__header-title">Deploy your wallet</h2>
                </header>

                {(() => {
                    switch (step) {
                        case DeployWalletStep.DEPLOY_MESSAGE:
                            return (
                                <PreparedMessage
                                    keyEntry={selectedDerivedKeyEntry}
                                    balance={tonWalletState?.balance}
                                    fees={fees}
                                    disabled={inProcess}
                                    error={error}
                                    onSubmit={onSubmit}
                                    onBack={onBack}
                                />
                            )

                        case DeployWalletStep.SELECT_TYPE:
                        default:
                            return (
                                <div className="deploy-wallet__wrapper">
                                    <div className="deploy-wallet__content-wallet-type-select">
                                        <Select
                                            options={walletTypesOptions}
                                            value={walletType?.value}
                                            getPopupContainer={(trigger) =>
                                                trigger.closest('.sliding-panel__content') ||
                                                document.getElementById('root') ||
                                                document.body
                                            }
                                            onChange={onChangeWalletType}
                                        />
                                    </div>

                                    <footer key="standard" className="deploy-wallet__footer">
                                        <Button text="Next" onClick={onNext} />
                                    </footer>
                                </div>
                            )
                    }
                })()}
            </div>
        )
    }

    return (
        <div className="deploy-wallet">
            <header className="deploy-wallet__header">
                <h2 className="deploy-wallet__header-title">Deploy your wallet</h2>
            </header>

            <div className="deploy-wallet__wrapper">
                <div className="deploy-wallet__content">
                    <p className="deploy-wallet__comment noselect">
                        You need to have at least {convertTons(totalAmount)} {NATIVE_CURRENCY} on
                        your account balance to deploy.
                    </p>
                    <h3 className="deploy-wallet__content-header--lead noselect">
                        Your address to receive {NATIVE_CURRENCY}
                    </h3>
                    <div className="deploy-wallet__qr-address-placeholder">
                        <div className="deploy-wallet__qr-address-code">
                            <QRCode value={`ton://chat/${selectedAccount.address}`} size={80} />
                        </div>
                        <div className="deploy-wallet__qr-address-address">
                            {selectedAccount.address}
                        </div>
                    </div>
                </div>

                <footer className="deploy-wallet__footer">
                    <CopyButton text={selectedAccount.address}>
                        <Button text="Copy address" />
                    </CopyButton>
                </footer>
            </div>
        </div>
    )
}
