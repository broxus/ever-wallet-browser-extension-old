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
import { useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { generateSeed, validateMnemonic } from '@popup/store/app/actions'


enum CreateSeedWay {
    CREATE,
    IMPORT,
    IMPORT_LEGACY,
    CONNECT_LEDGER,
}

enum WayStep {
    SHOW_PHRASE,
    CHECK_PHRASE,
    ENTER_PASSWORD,
    SELECT_CONTRACT_TYPE,
    IMPORT_PHRASE,
    CONNECT_LEDGER,
}

type OptionType = {
    value: CreateSeedWay;
    label: string;
}

const waysOptions: OptionType[] = [
    { value: CreateSeedWay.CREATE, label: 'Create new seed' },
    { value: CreateSeedWay.IMPORT, label: 'Import seed' },
    // { value: CreateSeedWay.IMPORT_LEGACY, label: 'Import seed (legacy)' },
    // { value: CreateSeedWay.CONNECT_LEDGER, label: 'Connect Ledger' },
]

export function CreateSeed(): JSX.Element {
    const accountability = useAccountsManagement()

    const [error, setError] = React.useState<string>()
    const [contractType, setContractType] = React.useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)
    const [inProcess, setInProcess] = React.useState(false)
    const [name, setName] = React.useState('')
    const [seed, setSeed] = React.useState(generateSeed())
    const [step, setStep] = React.useState<WayStep | null>(null)
    const [way, setWay] = React.useState<OptionType | null>(waysOptions[0])

    const seedWords = React.useMemo(() => seed.phrase.split(' '), [seed])

    const onChangeWay = (value: OptionType | null) => {
        setWay(value)
    }

    const onSubmit = async (password: string) => {
        setInProcess(true)
        await accountability.onCreateMasterKey({
            name,
            password,
            seed,
        }).then(async (seed) => {
            if (seed !== undefined) {
                await accountability.onCreateAccount({
                    name: `Account ${accountability.nextAccountId}`,
                    contractType,
                    publicKey: seed.publicKey,
                }).then((account) => {
                    if (account !== undefined) {
                        accountability.onManageAccount(account)
                    }
                })
            }
        }).catch((err: string) => {
            try {
                setError(err?.toString?.().replace(/Error: /gi, ''))
                setInProcess(false)
            } catch (e) {}
        })
    }

    const onNext = () => {
        switch (step) {
            case WayStep.SHOW_PHRASE:
                setStep(WayStep.CHECK_PHRASE)
                break

            case WayStep.CHECK_PHRASE:
                setStep(WayStep.SELECT_CONTRACT_TYPE)
                break

            case WayStep.SELECT_CONTRACT_TYPE:
                setStep(WayStep.ENTER_PASSWORD)
                break

            default:
                if (way?.value === CreateSeedWay.CREATE) {
                    setStep(WayStep.SHOW_PHRASE)
                }
                else if (
                    way?.value === CreateSeedWay.IMPORT
                    || way?.value === CreateSeedWay.IMPORT_LEGACY
                ) {
                    setStep(WayStep.IMPORT_PHRASE)
                }
                else if (way?.value === CreateSeedWay.CONNECT_LEDGER) {
                    setStep(WayStep.CONNECT_LEDGER)
                }
        }
    }

    const onNextWhenImport = (words: string[]) => {
        const phrase = words.join(' ')
        const mnemonicType: nt.MnemonicType = way?.value === CreateSeedWay.IMPORT_LEGACY
            ? { type: 'legacy' }
            : { type: 'labs', accountId: 0 }

        try {
            validateMnemonic(phrase, mnemonicType)
            setSeed({ phrase, mnemonicType })
            setStep(WayStep.SELECT_CONTRACT_TYPE)
        }
        catch (e) {
            setError(e.toString())
        }
    }

    const onBack = () => {
        switch (step) {
            case WayStep.SHOW_PHRASE:
            case WayStep.IMPORT_PHRASE:
                setStep(null)
                break

            case WayStep.CHECK_PHRASE:
                setStep(WayStep.SHOW_PHRASE)
                break

            case WayStep.ENTER_PASSWORD:
                setStep(WayStep.CHECK_PHRASE)
                break

            default:
                accountability.setStep(null)
        }
    }

    return (
        <>
            {step == null && (
                <div key="start" className="accounts-management__content">
                    <h2 className="accounts-management__content-title">Add seed phrase</h2>
                    <div className="accounts-management__content-form-rows">
                        <div className="accounts-management__content-form-row">
                            <Input
                                label="Enter seed name..."
                                autoFocus
                                type="text"
                                onChange={setName}
                            />
                        </div>

                        <div className="accounts-management__content-form-row">
                            <Select
                                options={waysOptions}
                                value={way}
                                styles={selectStyles}
                                onChange={onChangeWay}
                            />
                        </div>
                    </div>

                    <div className="accounts-management__content-buttons">
                        <div className="accounts-management__content-buttons-back-btn">
                            <Button
                                text="Back"
                                disabled={inProcess}
                                white
                                onClick={onBack}
                            />
                        </div>
                        <Button
                            text="Next"
                            type="submit"
                            onClick={onNext}
                        />
                    </div>
                </div>
            )}

            {step === WayStep.SHOW_PHRASE && (
                <NewSeedPhrase
                    key="exportedSeed"
                    seedWords={seedWords}
                    onNext={onNext}
                    onBack={onBack}
                />
            )}

            {step === WayStep.CHECK_PHRASE && (
                <CheckNewSeedPhrase
                    key="checkSeed"
                    seedWords={seedWords}
                    onSubmit={onNext}
                    onBack={onBack}
                />
            )}

            {step === WayStep.SELECT_CONTRACT_TYPE && (
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

            {step === WayStep.ENTER_PASSWORD && (
                <EnterNewSeedPasswords
                    key="enterPasswords"
                    disabled={inProcess}
                    error={error}
                    onSubmit={onSubmit}
                    onBack={onBack}
                />
            )}

            {step === WayStep.IMPORT_PHRASE && (
                <ImportSeed
                    key="importSeed"
                    wordsCount={way?.value === CreateSeedWay.IMPORT_LEGACY ? 24 : 12}
                    onSubmit={onNextWhenImport}
                    onBack={onBack}
                />
            )}
        </>
    )
}
