import * as React from 'react'

import * as nt from '@nekoton'
import {
    CheckNewSeedPhrase,
    EnterNewSeedPasswords,
    ImportSeed,
    NewSeedPhrase,
} from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { Select } from '@popup/components/Select'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { generateSeed, validateMnemonic } from '@popup/store/app/actions'
import { useRpc } from '@popup/providers/RpcProvider'
import { parseError } from '@popup/utils'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import AccountManager from '@popup/components/Ledger/AccountManager'

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
    IMPORT_PHRASE,
    CONNECT_LEDGER,
}

type OptionType = {
    key: AddSeedFlow
    value: AddSeedFlow
    label: string
}

const flowOptions: OptionType[] = [
    { key: AddSeedFlow.CREATE, label: 'Create new seed', value: AddSeedFlow.CREATE },
    { key: AddSeedFlow.IMPORT, label: 'Import seed', value: AddSeedFlow.IMPORT },
    { key: AddSeedFlow.IMPORT_LEGACY, label: 'Import legacy seed', value: AddSeedFlow.IMPORT_LEGACY, },
    { key: AddSeedFlow.CONNECT_LEDGER, label: 'Connect Ledger', value: AddSeedFlow.CONNECT_LEDGER },
]

export function CreateSeed(): JSX.Element {
    const accountability = useAccountability()
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [error, setError] = React.useState<string>()
    const [flow, setFlow] = React.useState<AddSeedFlow | undefined>(flowOptions[0].value)
    const [inProcess, setInProcess] = React.useState(false)
    const [name, setName] = React.useState<string>()
    const [seed, setSeed] = React.useState(generateSeed())
    const [step, setStep] = React.useState<FlowStep>(FlowStep.INDEX)

    const seedWords = React.useMemo(() => seed.phrase.split(' '), [seed])

    const onChangeFlow = (value: AddSeedFlow | undefined) => {
        setFlow(value)
    }

    const onSubmit = async (password: string) => {
        setInProcess(true)

        try {
            let nameToSave = name?.trim()
            if (nameToSave?.length === 0) {
                nameToSave = undefined
            }

            const entry = await rpc.createMasterKey({
                select: false,
                name: nameToSave,
                password,
                seed,
            })

            if (entry != null) {
                accountability.onManageMasterKey(entry)
                accountability.onManageDerivedKey(entry)
            }
        } catch (e: any) {
            setError(parseError(e))
            setInProcess(false)
        } finally {
            setInProcess(false)
        }
    }

    const onNext = () => {
        switch (step) {
            case FlowStep.SHOW_PHRASE:
                setStep(FlowStep.CHECK_PHRASE)
                break

            case FlowStep.CHECK_PHRASE:
                setStep(FlowStep.PASSWORD_REQUEST)
                break

            default:
                if (flow === AddSeedFlow.CREATE) {
                    setStep(FlowStep.SHOW_PHRASE)
                } else if (flow === AddSeedFlow.IMPORT || flow === AddSeedFlow.IMPORT_LEGACY) {
                    setStep(FlowStep.IMPORT_PHRASE)
                } else if (flow === AddSeedFlow.CONNECT_LEDGER) {
                    setStep(FlowStep.CONNECT_LEDGER)
                }
        }
    }

    const onNextWhenImport = (words: string[]) => {
        const phrase = words.join(' ')
        const mnemonicType: nt.MnemonicType =
            flow === AddSeedFlow.IMPORT_LEGACY ? { type: 'legacy' } : { type: 'labs', accountId: 0 }

        try {
            validateMnemonic(phrase, mnemonicType)
            setSeed({ phrase, mnemonicType })
            setStep(FlowStep.PASSWORD_REQUEST)
        } catch (e: any) {
            setError(parseError(e))
        }
    }

    const onBack = () => {
        setError(undefined)

        switch (step) {
            case FlowStep.SHOW_PHRASE:
            case FlowStep.IMPORT_PHRASE:
                setStep(FlowStep.INDEX)
                break

            case FlowStep.CHECK_PHRASE:
                setStep(FlowStep.SHOW_PHRASE)
                break

            case FlowStep.PASSWORD_REQUEST:
                if (flow === AddSeedFlow.CREATE) {
                    setStep(FlowStep.SHOW_PHRASE)
                } else if (flow === AddSeedFlow.IMPORT || flow === AddSeedFlow.IMPORT_LEGACY) {
                    setStep(FlowStep.IMPORT_PHRASE)
                } else if (flow === AddSeedFlow.CONNECT_LEDGER) {
                    setStep(FlowStep.CONNECT_LEDGER)
                }
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
                                    type="text"
                                    autocomplete="off"
                                    value={name || ''}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="accounts-management__content-form-row">
                                <Select<AddSeedFlow>
                                    options={flowOptions}
                                    value={flow}
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
                    wordsCount={flow === AddSeedFlow.IMPORT_LEGACY ? 24 : 12}
                    error={error}
                    onSubmit={onNextWhenImport}
                    onBack={onBack}
                />
            )}

            {step === FlowStep.CONNECT_LEDGER && (
                <AccountManager
                    name={name}
                    onBack={onBack}
                />
            )}

        </>
    )
}
