import React, { useState } from 'react'
import { Action } from '@utils'
import { Step, DEFAULT_CONTRACT_TYPE } from '@common'
import { generateSeed, createAccount } from '@store/app/actions'
import { connect } from 'react-redux'
import * as nt from '@nekoton'

import SignPolicy from '@components/SignPolicy'
import SelectContractType from '@components/SelectContractType'
import ExportedSeed from '@components/ExportedSeed'
import { CheckSeedOnCreation } from '@components/CheckSeed'
import EnterNewPassword from '@components/EnterNewPassword'
import Modal from '@components/Modal'

import './style.scss'

enum LocalStep {
    SIGN_POLICY,
    SELECT_CONTRACT_TYPE,
    SHOW_PHRASE,
    CHECK_PHRASE,
    ENTER_PASSWORD,
}

interface INewAccountPage {
    setStep: (step: Step) => void
    createAccount: Action<typeof createAccount>
}

const NewAccountPage: React.FC<INewAccountPage> = ({ setStep, createAccount }) => {
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SIGN_POLICY)
    const [error, setError] = useState<string>()

    const seed = useState<nt.GeneratedMnemonic>(generateSeed())[0]

    const [password, setPassword] = useState<string>('')
    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const onSubmit = async () => {
        try {
            await createAccount('Account 1', contractType, seed, password)
            setStep(Step.MAIN)
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
                        setStep(Step.WELCOME)
                    }}
                />
            )}
            {localStep == LocalStep.SELECT_CONTRACT_TYPE && (
                <SelectContractType
                    onSubmit={(contractType) => {
                        setContractType(contractType)
                        setLocalStep(LocalStep.SHOW_PHRASE)
                    }}
                    onBack={() => setStep(Step.WELCOME)}
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
                <CheckSeedOnCreation
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
                <EnterNewPassword
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
})(NewAccountPage)
