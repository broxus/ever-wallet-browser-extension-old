import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import Select from 'react-select'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import CheckSeedInput from '@popup/components/CheckSeedInput'
import Input from '@popup/components/Input'
import { selectStyles } from '@popup/constants/selectStyle'
import { generateSeed } from '@popup/store/app/actions'
import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { shuffleArray } from '@shared/utils'

import './style.scss'

interface IExportedSeed {
    onNext: () => void
    onBack: () => void
    seed: string[]
}

const ExportedSeed: React.FC<IExportedSeed> = ({ onNext, onBack, seed }) => {
    return (
        <div className="create-seed">
            <div className="create-seed__content">
                <div>
                    <h2 className="create-seed__content-title">Save the seed phrase</h2>
                    <ol>
                        {seed?.map((item: string, i: number) => (
                            <li key={i} className="create-seed__content-word">
                                {item.toLowerCase()}
                            </li>
                        ))}
                    </ol>
                </div>
                <div className="create-seed__content-buttons">
                    <div className="create-seed__content-buttons-back-btn">
                        <Button text={'Back'} white onClick={onBack} />
                    </div>
                    <Button text={'I wrote it down on paper'} onClick={onNext} />
                </div>
            </div>
        </div>
    )
}

interface ICheckSeed {
    onSubmit: () => void
    onBack: () => void
    seed: string[]
}

const generateRandomNumbers = () => {
    return shuffleArray(new Array(12).fill(1).map((_, i) => i + 1))
    .slice(0, 4)
    .sort((a, b) => a - b)
}

const CheckSeed: React.FC<ICheckSeed> = ({ onSubmit, onBack, seed }) => {
    const { register, handleSubmit, errors } = useForm()

    const numbers = useMemo(() => generateRandomNumbers(), [seed])

    const validateWord = (word: string, position: number) => {
        return seed?.[position - 1] === word
    }

    return (
        <div className="create-seed__content">
            <div>
                <h2 className="create-seed__content-title">Let’s check the seed phrase</h2>
                <form
                    id="words"
                    onSubmit={handleSubmit(onSubmit)}
                    className="check-seed__content-form"
                >
                    {numbers.map((item: number, i: number) => (
                        <CheckSeedInput
                            key={i}
                            number={item}
                            autoFocus={i === 0}
                            name={`word${i}`}
                            register={register({
                                required: true,
                                validate: (word: string) => validateWord(word, item),
                            })}
                        />
                    ))}
                    {(errors.word0 || errors.word1 || errors.word2 || errors.word3) && (
                        <div className="check-seed__content-error">Your seed doesn't match</div>
                    )}
                </form>
            </div>
            <div className="create-seed__content-buttons">
                <div className="create-seed__content-buttons-back-btn">
                    <Button text={'Back'} white onClick={onBack} />
                </div>
                <Button text={'Confirm'} onClick={handleSubmit(onSubmit)} form="words" />
            </div>
        </div>
    )
}

interface IEnterPassword {
    disabled?: boolean
    error?: string
    onSubmit: (password: string) => void
    onBack: () => void
}

const EnterPassword: React.FC<IEnterPassword> = ({
    disabled,
    error,
    onBack,
    ...props
}) => {
    const { register, handleSubmit, errors } = useForm<{ password: string }>()

    const onSubmit = ({ password }: { password: string }) => {
        props.onSubmit(password)
    }

    return (
        <div className="create-seed__content">
            <h2 className="create-seed__content-title">Enter password to confirm adding</h2>
            <form id="password" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    name="password"
                    register={register({
                        required: true,
                        minLength: 6,
                    })}
                    disabled={disabled}
                    label={'Password...'}
                    autoFocus
                    type={'password'}
                />
                {(errors.password || error) && (
                    <div className="check-seed__content-error">
                        {errors.password && 'The password is required'}
                        {error}
                    </div>
                )}
            </form>
            <div className="create-seed__content-buttons">
                <div className="create-seed__content-buttons-back-btn">
                    <Button text={'Back'} disabled={disabled} onClick={onBack} white />
                </div>
                <Button text={'Confirm'} disabled={disabled} onClick={handleSubmit(onSubmit)} />
            </div>
        </div>
    )
}

interface ICreateSeed {
    controllerRpc: IControllerRpcClient
    onSeedCreated?: (createdSeed: nt.KeyStoreEntry) => void
    onBack?: () => void
}

enum CreateSeedWay {
    CREATE,
    IMPORT,
}

enum CreateSeedWayStep {
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
    { value: CreateSeedWay.IMPORT, label: 'Import seed' }
]

const CreateSeed: React.FC<ICreateSeed> = ({
    controllerRpc,
    onSeedCreated,
    onBack,
}) => {
    const [inProcess, setInProcess] = useState(false)
    const [name, setName] = useState('')
    const [step, setStep] = useState<CreateSeedWayStep | null>(null)
    const [way, setWay] = useState<OptionType | null>(waysOptions[0])

    const seed = useMemo(() => generateSeed(), [])
    const seeds = useMemo(() => seed.phrase.split(' '), [seed])

    const onSubmit = async (password: string) => {
        setInProcess(true)
        await controllerRpc.createMasterKey({
            name,
            password,
            seed,
        }).then((seed) => {
            onSeedCreated?.(seed)
        }).finally(() => {
            setInProcess(false)
        })
    }

    return (
        <>
            {step == null && (
                <div key="start" className="create-seed__content">
                    <h2 className="create-seed__content-title">Add seed phrase</h2>
                    <div className="create-seed__content-form-rows">
                        <Input
                            label={'Enter seed name...'}
                            autoFocus
                            type={'text'}
                            onChange={setName}
                        />
                        <Select
                            options={waysOptions}
                            value={way}
                            styles={selectStyles}
                            onChange={value => {
                                setWay(value)
                            }}
                        />
                    </div>

                    <div className="create-seed__content-buttons">
                        {onBack !== undefined && (
                            <div className="create-seed__content-buttons-back-btn">
                                <Button text={'Back'} disabled={inProcess} onClick={onBack} white />
                            </div>
                        )}
                        <Button
                            text={'Next'}
                            type="submit"
                            disabled={!name.length}
                            onClick={() => {
                                if (way?.value === CreateSeedWay.CREATE) {
                                    setStep(CreateSeedWayStep.SHOW_PHRASE)
                                }
                            }}
                        />
                    </div>
                </div>
            )}
            {step == CreateSeedWayStep.SHOW_PHRASE && (
                <ExportedSeed
                    key="exportedSeed"
                    onBack={() => {
                        setStep(null)
                    }}
                    onNext={() => {
                        setStep(CreateSeedWayStep.CHECK_PHRASE)
                    }}
                    seed={seeds}
                />
            )}
            {step == CreateSeedWayStep.CHECK_PHRASE && (
                <CheckSeed
                    onSubmit={() => {
                        setStep(CreateSeedWayStep.ENTER_PASSWORD)
                    }}
                    onBack={() => {
                        setStep(CreateSeedWayStep.SHOW_PHRASE)
                    }}
                    seed={seeds}
                />
            )}
            {step == CreateSeedWayStep.ENTER_PASSWORD && (
                <EnterPassword
                    disabled={inProcess}
                    onSubmit={onSubmit}
                    onBack={() => {
                        setStep(CreateSeedWayStep.SHOW_PHRASE)
                    }}
                />
            )}
        </>
    )
}

export default CreateSeed
