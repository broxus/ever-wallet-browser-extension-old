import React, { useState } from 'react'
import { Step, DEFAULT_CONTRACT_TYPE, Action } from '../../common'
import { createAccount, validateMnemonic } from '../../store/app/actions'
import { connect } from 'react-redux'

import * as nt from '../../../../nekoton/pkg'

import SelectContractType from '../../components/SelectContractType'
import EnterSeed from '../../components/EnterSeed'
import EnterPasswordScreen from '../../components/EnterPasswordScreen'
import Modal from '../../components/Modal/Modal'

import './style.scss'

enum LocalStep {
    SELECT_CONTRACT_TYPE,
    ENTER_PHRASE,
    ENTER_PASSWORD,
}

interface ISetupScreen {
    setStep: (step: Step) => void
    createAccount: Action<typeof createAccount>
}

const RestoreAccountScreen: React.FC<ISetupScreen> = ({ setStep, createAccount }) => {
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SELECT_CONTRACT_TYPE)
    const [error, setError] = useState<string>()

    const [seed, setSeed] = useState<nt.GeneratedMnemonic>()

    const [password, setPassword] = useState<string>('')
    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const onSubmit = async () => {
        try {
            if (seed == null) {
                throw Error('Seed must be specified')
            }

            await createAccount('Account 1', contractType, seed, password)
            setStep(Step.MAIN_PAGE)
        } catch (e) {
            setError(e.toString())
        }
    }

    const mnemonicType: nt.MnemonicType =
        contractType == 'WalletV3' ? { type: 'legacy' } : { type: 'labs', accountId: 0 }
    const wordCount = contractType === 'WalletV3' ? 24 : 12

    return (
        <>
            {localStep == LocalStep.SELECT_CONTRACT_TYPE && (
                <SelectContractType
                    onSubmit={(contractType) => {
                        setContractType(contractType)
                        setLocalStep(LocalStep.ENTER_PHRASE)
                    }}
                    onReturnBack={() => setStep(Step.WELCOME_PAGE)}
                    onSkip={() => setStep(Step.MAIN_PAGE)}
                    excludedContracts={['WalletV3']}
                />
            )}
            {localStep == LocalStep.ENTER_PHRASE && (
                <EnterSeed
                    onSubmit={(words) => {
                        const phrase = words.join(' ')

                        try {
                            validateMnemonic(phrase, mnemonicType)
                            setSeed({ phrase, mnemonicType })
                            setLocalStep(LocalStep.ENTER_PASSWORD)
                        } catch (e) {
                            setError(e.toString)
                        }
                    }}
                    onBack={() => setLocalStep(LocalStep.SELECT_CONTRACT_TYPE)}
                    wordCount={wordCount}
                />
            )}
            {localStep == LocalStep.ENTER_PASSWORD && (
                <EnterPasswordScreen
                    onSubmit={async (password) => {
                        setPassword(password)
                        await onSubmit()
                    }}
                    onBack={() => {
                        setLocalStep(LocalStep.ENTER_PHRASE)
                    }}
                />
            )}
            {error && (
                <Modal
                    onClose={() => {
                        setError(undefined)
                    }}
                    className="enter-password-screen__modal"
                >
                    <h3 style={{ color: 'black', marginBottom: '18px' }}>
                        Could not import wallet
                    </h3>
                    <div className="check-seed__content-error">{error}</div>
                </Modal>
            )}
        </>
    )
}

export default connect(null, {
    createAccount,
})(RestoreAccountScreen)
