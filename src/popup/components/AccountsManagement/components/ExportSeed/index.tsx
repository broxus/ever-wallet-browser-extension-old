import * as React from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { useForm } from 'react-hook-form'
import ReactTooltip from 'react-tooltip'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import Input from '@popup/components/Input'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { parseError } from '@popup/utils'

type Props = {
    onBack(): void
}

enum ExportSeedStep {
    PASSWORD_REQUEST,
    COPY_SEED_PHRASE,
    SEED_PHRASE_COPIED,
}

export function ExportSeed({ onBack }: Props): JSX.Element {
    const accountability = useAccountability()
    const rpc = useRpc()

    const { register, handleSubmit, formState } = useForm<{ password: string }>()

    const [error, setError] = React.useState<string>()
    const [inProcess, setInProcess] = React.useState(false)
    const [seedPhrase, setSeedPhrase] = React.useState<string[]>()
    const [step, setStep] = React.useState<ExportSeedStep>(ExportSeedStep.PASSWORD_REQUEST)

    const onCopy = () => {
        setStep(ExportSeedStep.SEED_PHRASE_COPIED)
    }

    const prepareExportKey = (entry: nt.KeyStoreEntry, password: string) => {
        switch (entry.signerName) {
            case 'encrypted_key':
                return {
                    type: entry.signerName,
                    data: {
                        publicKey: entry.publicKey,
                        password,
                    },
                } as nt.ExportKey
            case 'master_key':
                return {
                    type: entry.signerName,
                    data: {
                        masterKey: entry.masterKey,
                        password,
                    },
                } as nt.ExportKey
            case 'ledger_key':
                throw new Error('Unsupported operation')
        }
    }

    const onSubmit = async ({ password }: { password: string }) => {
        if (accountability.currentMasterKey == null) {
            return
        }

        setInProcess(true)

        try {
            await rpc
                .exportMasterKey(prepareExportKey(accountability.currentMasterKey, password))
                .then(({ phrase }) => {
                    setSeedPhrase(phrase.split(' '))
                    setStep(ExportSeedStep.COPY_SEED_PHRASE)
                })
                .catch((e: string) => {
                    setError(parseError(e))
                })
                .finally(() => {
                    setInProcess(false)
                })
        } catch (e: any) {
            setError(parseError(e))
        } finally {
            setInProcess(false)
        }
    }

    return (
        <>
            {step === ExportSeedStep.PASSWORD_REQUEST && (
                <div key="passwordRequest" className="accounts-management">
                    <header className="accounts-management__header">
                        <h2 className="accounts-management__header-title">Export a seed phrase</h2>
                    </header>

                    <div className="accounts-management__wrapper">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="accounts-management__content-form-rows">
                                <div className="accounts-management__content-form-row">
                                    <Input
                                        {...register('password', {
                                            required: true,
                                            minLength: 6,
                                        })}
                                        disabled={inProcess}
                                        label="Enter seed password..."
                                        type="password"
                                    />

                                    {(formState.errors.password || error) && (
                                        <div className="accounts-management__content-error">
                                            {formState.errors.password &&
                                                'The password is required'}
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>

                        <footer className="accounts-management__footer">
                            <div className="accounts-management__footer-button-back">
                                <Button text="Back" white onClick={onBack} />
                            </div>
                            <Button text="Confirm" onClick={handleSubmit(onSubmit)} />
                        </footer>
                    </div>
                </div>
            )}

            {step !== null &&
                [ExportSeedStep.COPY_SEED_PHRASE, ExportSeedStep.SEED_PHRASE_COPIED].includes(
                    step
                ) && (
                    <div key="copySeedPhrase" className="accounts-management">
                        <header className="accounts-management__header">
                            <h2 className="accounts-management__header-title">
                                Save the seed phrase
                            </h2>
                        </header>

                        <div className="accounts-management__wrapper">
                            <div className="accounts-management__content">
                                <ol>
                                    {seedPhrase?.map((item) => (
                                        <li
                                            key={item}
                                            className="accounts-management__content-word"
                                        >
                                            {item.toLowerCase()}
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <footer className="accounts-management__footer">
                                <div className="accounts-management__footer-button-back">
                                    <Button text="Back" white onClick={onBack} />
                                </div>
                                <div data-tip="Copied!" data-event="click focus">
                                    {step === ExportSeedStep.COPY_SEED_PHRASE && (
                                        <CopyToClipboard
                                            text={seedPhrase?.length ? seedPhrase.join(' ') : ''}
                                            onCopy={onCopy}
                                        >
                                            <Button text="Copy all words" />
                                        </CopyToClipboard>
                                    )}
                                    {step === ExportSeedStep.SEED_PHRASE_COPIED && (
                                        <Button text="I save it down" onClick={onBack} />
                                    )}
                                    <ReactTooltip type="dark" effect="solid" place="top" />
                                </div>
                            </footer>
                        </div>
                    </div>
                )}
        </>
    )
}
