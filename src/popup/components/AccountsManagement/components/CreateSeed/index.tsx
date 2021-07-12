import * as React from 'react'
import Select from 'react-select'

import * as nt from '@nekoton'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import {
    CheckNewSeedPhrase,
    EnterNewSeedPasswords,
    ImportSeed,
    NewSeedPhrase,
    NewAccountContractType,
} from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { selectStyles } from '@popup/constants/selectStyle'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { generateSeed, validateMnemonic } from '@popup/store/app/actions'
import { useRpc } from '@popup/providers/RpcProvider'
import { parseError } from '@popup/utils'

enum AddSeedFlow {
    CREATE,
    IMPORT,
    IMPORT_LEGACY,
    CONNECT_LEDGER,
}

enum FlowStep {
    INDEX,
    SHOW_PHRASE,
    CHECK_PHRASE,
    PASSWORD_REQUEST,
    SELECT_CONTRACT_TYPE,
    IMPORT_PHRASE,
    CONNECT_LEDGER,
}

type OptionType = {
    value: AddSeedFlow
    label: string
}

const flowOptions: OptionType[] = [
    { value: AddSeedFlow.CREATE, label: 'Create new seed' },
    { value: AddSeedFlow.IMPORT, label: 'Import seed' },
    // { value: AddSeedFlow.IMPORT_LEGACY, label: 'Import seed (legacy)' },
    // { value: AddSeedFlow.CONNECT_LEDGER, label: 'Connect Ledger' },
]

export function CreateSeed(): JSX.Element {
    const accountability = useAccountability()
    const rpc = useRpc()

    const [contractType, setContractType] = React.useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)
    const [error, setError] = React.useState<string>()
    const [flow, setFlow] = React.useState<OptionType | null>(flowOptions[0])
    const [inProcess, setInProcess] = React.useState(false)
    const [name, setName] = React.useState<string>()
    const [seed, setSeed] = React.useState(generateSeed())
    const [step, setStep] = React.useState<FlowStep>(FlowStep.INDEX)

    const seedWords = React.useMemo(() => seed.phrase.split(' '), [seed])

    const onChangeFlow = (value: OptionType | null) => {
        setFlow(value)
    }

    const onSubmit = async (password: string) => {
        setInProcess(true)

        try {
            let nameToSave = name?.trim()
            if (nameToSave?.length === 0) {
                nameToSave = undefined
            }
            await rpc
                .createMasterKey({
                    name: nameToSave,
                    password,
                    seed,
                })
                .then(async (seed) => {
                    if (seed !== undefined) {
                        accountability.onManageMasterKey(seed)
                        accountability.onManageDerivedKey(seed)
                        await rpc
                            .createAccount({
                                contractType,
                                name: `Account ${accountability.nextAccountId + 1}`,
                                publicKey: seed.publicKey,
                            })
                            .then((account) => {
                                setInProcess(false)

                                if (account !== undefined) {
                                    accountability.onManageAccount(account)
                                }
                            })
                            .catch((e) => {
                                setError(parseError(e))
                                setInProcess(false)
                            })
                    }
                })
                .catch((e) => {
                    setError(parseError(e))
                    setInProcess(false)
                })
        } catch (e) {
            setError(parseError(e))
            setInProcess(false)
        }
    }

    const onNext = () => {
        switch (step) {
            case FlowStep.SHOW_PHRASE:
                setStep(FlowStep.CHECK_PHRASE)
                break

            case FlowStep.CHECK_PHRASE:
                setStep(FlowStep.SELECT_CONTRACT_TYPE)
                break

            case FlowStep.SELECT_CONTRACT_TYPE:
                setStep(FlowStep.PASSWORD_REQUEST)
                break

            default:
                if (flow?.value === AddSeedFlow.CREATE) {
                    setStep(FlowStep.SHOW_PHRASE)
                } else if (
                    flow?.value === AddSeedFlow.IMPORT ||
                    flow?.value === AddSeedFlow.IMPORT_LEGACY
                ) {
                    setStep(FlowStep.IMPORT_PHRASE)
                } else if (flow?.value === AddSeedFlow.CONNECT_LEDGER) {
                    setStep(FlowStep.CONNECT_LEDGER)
                }
        }
    }

    const onNextWhenImport = (words: string[]) => {
        const phrase = words.join(' ')
        const mnemonicType: nt.MnemonicType =
            flow?.value === AddSeedFlow.IMPORT_LEGACY
                ? { type: 'legacy' }
                : { type: 'labs', accountId: 0 }

        try {
            validateMnemonic(phrase, mnemonicType)
            setSeed({ phrase, mnemonicType })
            setStep(FlowStep.SELECT_CONTRACT_TYPE)
        } catch (e) {
            setError(parseError(e))
        }
    }

    const onBack = () => {
        switch (step) {
            case FlowStep.SHOW_PHRASE:
            case FlowStep.IMPORT_PHRASE:
                setStep(FlowStep.INDEX)
                break

            case FlowStep.CHECK_PHRASE:
                setStep(FlowStep.SHOW_PHRASE)
                break

            case FlowStep.SELECT_CONTRACT_TYPE:
                setStep(FlowStep.CHECK_PHRASE)
                break

            case FlowStep.PASSWORD_REQUEST:
                setStep(FlowStep.SELECT_CONTRACT_TYPE)
                break

            default:
                accountability.setStep(Step.MANAGE_SEEDS)
        }
    }

    return (
        <>
            {step === FlowStep.INDEX && (
                <div key="index" className="accounts-management">
                    <header className="accounts-management__header">
                        <h2 className="accounts-management__header-title">Add seed phrase</h2>
                    </header>

                    <div className="accounts-management__wrapper">
                        <div className="accounts-management__content-form-rows">
                            <div className="accounts-management__content-form-row">
                                <Input
                                    label="Enter seed name..."
                                    autoFocus
                                    type="text"
                                    value={name || ''}
                                    onChange={setName}
                                />
                            </div>

                            <div className="accounts-management__content-form-row">
                                <Select
                                    options={flowOptions}
                                    value={flow}
                                    styles={selectStyles}
                                    onChange={onChangeFlow}
                                />
                            </div>
                        </div>

                        <footer className="accounts-management__footer">
                            <div className="accounts-management__footer-button-back">
                                <Button text="Back" disabled={inProcess} white onClick={onBack} />
                            </div>
                            <Button text="Next" type="submit" onClick={onNext} />
                        </footer>
                    </div>
                </div>
            )}

            {step === FlowStep.SHOW_PHRASE && (
                <NewSeedPhrase
                    key="exportedSeed"
                    seedWords={seedWords}
                    onNext={onNext}
                    onBack={onBack}
                />
            )}

            {step === FlowStep.CHECK_PHRASE && (
                <CheckNewSeedPhrase
                    key="checkSeed"
                    seedWords={seedWords}
                    onSubmit={onNext}
                    onBack={onBack}
                />
            )}

            {step === FlowStep.SELECT_CONTRACT_TYPE && (
                <NewAccountContractType
                    key="accountType"
                    contractType={contractType}
                    error={error}
                    disabled={inProcess}
                    mode="import"
                    onSelectContractType={setContractType}
                    onSubmit={onNext}
                    onBack={onBack}
                />
            )}

            {step === FlowStep.PASSWORD_REQUEST && (
                <EnterNewSeedPasswords
                    key="passwordRequest"
                    disabled={inProcess}
                    error={error}
                    onSubmit={onSubmit}
                    onBack={onBack}
                />
            )}

            {step === FlowStep.IMPORT_PHRASE && (
                <ImportSeed
                    key="importSeed"
                    wordsCount={flow?.value === AddSeedFlow.IMPORT_LEGACY ? 24 : 12}
                    onSubmit={onNextWhenImport}
                    onBack={onBack}
                />
            )}
        </>
    )
}
