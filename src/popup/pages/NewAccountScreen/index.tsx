import React, { useState } from 'react'
import { Step, DEFAULT_CONTRACT_TYPE, Action } from '../../common'
import { generateSeed, createAccount } from '../../store/app/actions'
import { connect } from 'react-redux'

import * as nt from '../../../../nekoton/pkg'

import SignPolicy from '../../components/SignPolicy'
import SelectContractType from '../../components/SelectContractType'
import ExportedSeed from '../../components/ExportedSeed'
import CheckSeed from '../../components/CheckSeed'
import EnterPasswordScreen from '../../components/EnterPasswordScreen'
import Modal from '../../components/Modal/Modal'

import './style.scss'

enum LocalStep {
    SIGN_POLICY,
    SELECT_CONTRACT_TYPE,
    SHOW_PHRASE,
    CHECK_PHRASE,
    ENTER_PASSWORD,
}

interface ISetupScreen {
    setStep: (step: Step) => void
    createAccount: Action<typeof createAccount>
}

const NewAccountScreen: React.FC<ISetupScreen> = ({ setStep, createAccount }) => {
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SIGN_POLICY)
    const [error, setError] = useState<string>()

    const seed = useState<nt.GeneratedMnemonic>(generateSeed())[0]

    const [password, setPassword] = useState<string>('')
    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const onSubmit = async () => {
        try {
            await createAccount('Account 1', contractType, seed, password)
            setStep(Step.MAIN_PAGE)
        } catch (e) {
            setError(e.toString())
        }
    }

    const splitSeed = seed.phrase.split(' ')

    return (
        <>
            {localStep == LocalStep.SIGN_POLICY && (
                <SignPolicy
                    onSubmit={() => {
                        setLocalStep(LocalStep.SELECT_CONTRACT_TYPE)
                    }}
                    onBack={() => {
                        setStep(Step.WELCOME_PAGE)
                    }}
                />
            )}
            {localStep == LocalStep.SELECT_CONTRACT_TYPE && (
                <SelectContractType
                    onSubmit={(contractType) => {
                        setContractType(contractType)
                        setLocalStep(LocalStep.SHOW_PHRASE)
                    }}
                    onBack={() => setStep(Step.WELCOME_PAGE)}
                    excludedContracts={['WalletV3']}
                />
            )}
            {localStep == LocalStep.SHOW_PHRASE && (
                <ExportedSeed
                    onBack={() => {
                        setLocalStep(LocalStep.SELECT_CONTRACT_TYPE)
                    }}
                    onNext={() => {
                        setLocalStep(LocalStep.CHECK_PHRASE)
                    }}
                    seed={splitSeed}
                />
            )}
            {localStep == LocalStep.CHECK_PHRASE && (
                <CheckSeed
                    onSubmit={() => {
                        setLocalStep(LocalStep.ENTER_PASSWORD)
                    }}
                    onBack={() => {
                        setLocalStep(LocalStep.SHOW_PHRASE)
                    }}
                    seed={splitSeed}
                />
            )}
            {localStep == LocalStep.ENTER_PASSWORD && (
                <EnterPasswordScreen
                    onSubmit={async (password) => {
                        setPassword(password)
                        await onSubmit()
                    }}
                    onBack={() => {
                        setLocalStep(LocalStep.SHOW_PHRASE)
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
                        Could not create wallet
                    </h3>
                    <div className="check-seed__content-error">{error}</div>
                </Modal>
            )}
        </>
    )
}

export default connect(null, {
    createAccount,
})(NewAccountScreen)
