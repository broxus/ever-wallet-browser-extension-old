import * as React from 'react'
import { IntlShape, useIntl } from 'react-intl'

import * as nt from '@nekoton'
import { DEFAULT_WALLET_TYPE } from '@shared/contracts'
import {
    NewAccountContractType,
    SelectAccountAddingFlow,
} from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import {
    AccountabilityContext,
    Step,
    useAccountability,
} from '@popup/providers/AccountabilityProvider'
import { Panel, useDrawerPanel } from '@popup/providers/DrawerPanelProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { parseError } from '@popup/utils'

export enum AddAccountFlow {
    CREATE,
    IMPORT,
}

enum FlowStep {
    INDEX,
    ENTER_ADDRESS,
    ENTER_NAME,
    SELECT_CONTRACT_TYPE,
}

const defaultAccountName = (accountability: AccountabilityContext, intl: IntlShape) => {
    const accountId = accountability.currentDerivedKey?.accountId || 0
    const number = accountability.currentDerivedKeyAccounts.length
    return intl.formatMessage(
        { id: 'ACCOUNT_GENERATED_NAME' },
        { accountId: accountId + 1, number: number + 1 }
    )
}

type Props = {
    onBackFromIndex?(): void
}

export function CreateAccount({ onBackFromIndex }: Props): JSX.Element {
    const intl = useIntl()
    const accountability = useAccountability()
    const drawer = useDrawerPanel()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [address, setAddress] = React.useState('')
    const [error, setError] = React.useState<string>()
    const [flow, setFlow] = React.useState(AddAccountFlow.CREATE)
    const [inProcess, setInProcess] = React.useState(false)
    const [step, setStep] = React.useState(FlowStep.INDEX)
    const [name, setName] = React.useState(defaultAccountName(accountability, intl))
    const [contractType, setContractType] = React.useState<nt.ContractType>(DEFAULT_WALLET_TYPE)

    const onManageDerivedKey = () => {
        accountability.setStep(Step.MANAGE_DERIVED_KEY)
        drawer.setPanel(Panel.MANAGE_SEEDS)
    }

    const onSubmit = async () => {
        if (accountability.currentDerivedKey == null || inProcess) {
            return
        }

        setInProcess(true)

        try {
            const account = await rpc.createAccount({
                contractType,
                name,
                publicKey: accountability.currentDerivedKey.publicKey,
                workchain: 0,
            })
            if (account !== undefined) {
                drawer.setPanel(Panel.MANAGE_SEEDS)
                accountability.onManageAccount(account)
            }
        } catch (e: any) {
            setError(parseError(e))
        } finally {
            setInProcess(false)
        }
    }

    const onAddExisting = async () => {
        if (accountability.currentDerivedKey == null) {
            return
        }

        setInProcess(true)

        await rpc
            .getTonWalletInitData(address)
            .then(async ({ publicKey, contractType, workchain, custodians }) => {
                if (accountability.currentDerivedKey == null) {
                    return
                }

                const currentPublicKey = accountability.currentDerivedKey.publicKey

                switch (true) {
                    // Is deployer
                    case publicKey === currentPublicKey:
                        {
                            const hasAccount = accountability.currentDerivedKeyAccounts.some(
                                (account) => account.tonWallet.address === address
                            )

                            if (!hasAccount) {
                                await rpc
                                    .createAccount({
                                        contractType,
                                        publicKey,
                                        name,
                                        workchain,
                                        explicitAddress: address,
                                    })
                                    .then((account) => {
                                        drawer.setPanel(Panel.MANAGE_SEEDS)
                                        accountability.onManageAccount(account)
                                        console.log('address not found in derived key -> create')
                                    })
                            } else {
                                setError(
                                    intl.formatMessage({
                                        id: 'CREATE_ACCOUNT_PANEL_ACCOUNT_EXISTS_ERROR',
                                    })
                                )
                            }
                        }
                        break

                    case custodians.includes(currentPublicKey):
                        {
                            const existingAccount = rpcState.state.accountEntries[address] as
                                | nt.AssetsList
                                | undefined

                            if (existingAccount == null) {
                                await rpc
                                    .addExternalAccount(address, publicKey, currentPublicKey)
                                    .then(async () =>
                                        rpc.createAccount({
                                            contractType,
                                            publicKey,
                                            name,
                                            workchain,
                                            explicitAddress: address,
                                        })
                                    )
                                    .then(async (account) => {
                                        drawer.setPanel(Panel.MANAGE_SEEDS)
                                        accountability.onManageAccount(account)
                                        console.log('create and add account to externals')
                                    })
                                    .catch(console.error)
                            } else {
                                await rpc.addExternalAccount(address, publicKey, currentPublicKey)
                                await rpc.updateAccountVisibility(address, true)
                                drawer.setPanel(Panel.MANAGE_SEEDS)
                                accountability.onManageAccount(existingAccount)
                                console.log('add to externals')
                            }
                        }
                        break

                    // Not custodian
                    case !custodians.includes(currentPublicKey): {
                        setError(
                            intl.formatMessage({
                                id: 'CREATE_ACCOUNT_PANEL_NOT_CUSTODIAN_ERROR',
                            })
                        )
                    }
                }

                setInProcess(false)
            })
            .catch((e) => {
                setError(parseError(e))
                setInProcess(false)
            })
    }

    const onNext = () => {
        switch (step) {
            case FlowStep.INDEX:
                if (flow === AddAccountFlow.CREATE) {
                    setStep(FlowStep.ENTER_NAME)
                } else if (flow === AddAccountFlow.IMPORT) {
                    setStep(FlowStep.ENTER_ADDRESS)
                }
                break

            case FlowStep.ENTER_NAME:
                setStep(FlowStep.SELECT_CONTRACT_TYPE)
        }
    }

    const onBack = () => {
        switch (step) {
            case FlowStep.ENTER_NAME:
            case FlowStep.ENTER_ADDRESS:
                setError(undefined)
                setStep(FlowStep.INDEX)
                break

            case FlowStep.SELECT_CONTRACT_TYPE:
                if (flow === AddAccountFlow.CREATE) {
                    setStep(FlowStep.ENTER_NAME)
                } else if (flow === AddAccountFlow.IMPORT) {
                    setStep(FlowStep.ENTER_ADDRESS)
                }
                break

            default:
                accountability.setStep(Step.MANAGE_DERIVED_KEY)
        }
    }

    React.useEffect(() => {
        if (
            accountability.currentDerivedKey == null &&
            accountability.derivedKeys[0] !== undefined
        ) {
            accountability.setCurrentDerivedKey(accountability.derivedKeys[0])
        }
        setContractType(DEFAULT_WALLET_TYPE)
    }, [accountability.currentDerivedKey])

    return (
        <>
            {step === FlowStep.INDEX && (
                <SelectAccountAddingFlow
                    key="selectFlow"
                    flow={flow}
                    onSelect={setFlow}
                    onBack={onBackFromIndex}
                    onNext={onNext}
                />
            )}

            {(step === FlowStep.ENTER_NAME || step === FlowStep.ENTER_ADDRESS) && (
                <div key="enterName" className="accounts-management">
                    <header className="accounts-management__header">
                        <h2 className="accounts-management__header-title">
                            {step === FlowStep.ENTER_ADDRESS
                                ? intl.formatMessage({
                                      id: 'ADD_ACCOUNT_PANEL_FLOW_ADD_EXTERNAL_LABEL',
                                  })
                                : intl.formatMessage({
                                      id: 'ADD_ACCOUNT_PANEL_FLOW_CREATE_LABEL',
                                  })}
                        </h2>
                    </header>

                    <div className="accounts-management__wrapper">
                        <div className="accounts-management__content">
                            <div className="accounts-management__content-form-rows">
                                <div className="accounts-management__content-form-row">
                                    <Input
                                        name="name"
                                        label={intl.formatMessage({
                                            id: 'ENTER_ACCOUNT_NAME_FIELD_PLACEHOLDER',
                                        })}
                                        autoFocus
                                        autocomplete="off"
                                        type="text"
                                        value={name || ''}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                {step === FlowStep.ENTER_ADDRESS && (
                                    <div className="accounts-management__content-form-row">
                                        <Input
                                            name="name"
                                            label={intl.formatMessage({
                                                id: 'ENTER_MULTISIG_ADDRESS_FIELD_PLACEHOLDER',
                                            })}
                                            autoFocus
                                            autocomplete="off"
                                            type="text"
                                            value={address || ''}
                                            onChange={(e) => setAddress(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            {error !== undefined && (
                                <div className="accounts-management__content-error">{error}</div>
                            )}
                        </div>

                        <footer className="accounts-management__footer">
                            <div className="accounts-management__footer-button-back">
                                <Button
                                    text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                                    white
                                    onClick={onBack}
                                />
                            </div>
                            <Button
                                text={
                                    step === FlowStep.ENTER_ADDRESS
                                        ? intl.formatMessage({ id: 'ADD_ACCOUNT_BTN_TEXT' })
                                        : intl.formatMessage({ id: 'NEXT_BTN_TEXT' })
                                }
                                disabled={
                                    step === FlowStep.ENTER_ADDRESS ? address.length === 0 : false
                                }
                                onClick={step === FlowStep.ENTER_ADDRESS ? onAddExisting : onNext}
                            />
                        </footer>
                    </div>
                </div>
            )}

            {step === FlowStep.SELECT_CONTRACT_TYPE && (
                <NewAccountContractType
                    key="accountType"
                    contractType={contractType}
                    error={error}
                    disabled={inProcess}
                    mode="create"
                    onSelectContractType={setContractType}
                    onSubmit={onSubmit}
                    onBack={onBack}
                />
            )}
        </>
    )
}
