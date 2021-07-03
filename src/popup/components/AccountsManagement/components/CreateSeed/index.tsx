import * as React from 'react'
import Select from 'react-select'

import {
    CheckNewSeedPhrase,
    EnterNewSeedPasswords,
    NewSeedPhrase,
} from '@popup/components/AccountsManagement/components'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { selectStyles } from '@popup/constants/selectStyle'
import { useAccountsManagement } from '@popup/providers/AccountsManagementProvider'
import { generateSeed } from '@popup/store/app/actions'


enum CreateSeedWay {
    CREATE,
    IMPORT,
    IMPORT_LEGACY,
}

enum CreateWayStep {
    SHOW_PHRASE,
    CHECK_PHRASE,
    ENTER_PASSWORD,
}

type OptionType = {
    value: CreateSeedWay
    label: string
}

const waysOptions: OptionType[] = [
    { value: CreateSeedWay.CREATE, label: 'Create new seed' },
    { value: CreateSeedWay.IMPORT, label: 'Import seed' },
    { value: CreateSeedWay.IMPORT_LEGACY, label: 'Import seed (legacy)' },
]

export function CreateSeed(): JSX.Element {
    const manager = useAccountsManagement()

    const [error, setError] = React.useState<string>()
    const [inProcess, setInProcess] = React.useState(false)
    const [name, setName] = React.useState('')
    const [step, setStep] = React.useState<CreateWayStep | null>(null)
    const [way, setWay] = React.useState<OptionType | null>(waysOptions[0])

    const seed = React.useMemo(() => generateSeed(), [])
    const seedWords = React.useMemo(() => seed.phrase.split(' '), [seed])

    const onChangeWay = (value: OptionType | null) => {
        setWay(value)
    }

    const onSubmit = async (password: string) => {
        setInProcess(true)
        await manager.onCreateMasterKey({
            name,
            password,
            seed,
        }).catch((err: string) => {
            try {
                setError(err?.toString?.().replace(/Error: /gi, ''))
            } catch (e) {}
        }).finally(() => {
            setInProcess(false)
        })
    }

    const onNext = () => {
        switch (step) {
            case CreateWayStep.SHOW_PHRASE:
                setStep(CreateWayStep.CHECK_PHRASE)
                break

            case CreateWayStep.CHECK_PHRASE:
                setStep(CreateWayStep.ENTER_PASSWORD)
                break

            default:
                if (way?.value === CreateSeedWay.CREATE) {
                    setStep(CreateWayStep.SHOW_PHRASE)
                }
        }
    }

    const onBack = () => {
        switch (step) {
            case CreateWayStep.SHOW_PHRASE:
                setStep(null)
                break

            case CreateWayStep.CHECK_PHRASE:
                setStep(CreateWayStep.SHOW_PHRASE)
                break

            case CreateWayStep.ENTER_PASSWORD:
                setStep(CreateWayStep.CHECK_PHRASE)
                break

            default:
                manager.setStep(null)
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
                                onClick={onBack}
                                white
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

            {step == CreateWayStep.SHOW_PHRASE && (
                <NewSeedPhrase
                    key="exportedSeed"
                    seedWords={seedWords}
                    onNext={onNext}
                    onBack={onBack}
                />
            )}

            {step == CreateWayStep.CHECK_PHRASE && (
                <CheckNewSeedPhrase
                    key="checkSeed"
                    seedWords={seedWords}
                    onSubmit={onNext}
                    onBack={onBack}
                />
            )}

            {step == CreateWayStep.ENTER_PASSWORD && (
                <EnterNewSeedPasswords
                    key="enterPasswords"
                    disabled={inProcess}
                    error={error}
                    onSubmit={onSubmit}
                    onBack={onBack}
                />
            )}
        </>
    )
}
