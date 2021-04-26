import React, { useState } from 'react'
import { connect } from 'react-redux'
import { Action } from '@utils'
import { Step, DEFAULT_CONTRACT_TYPE } from '@common'
import { createAccount, validateMnemonic } from '@store/app/actions'
import * as nt from '@nekoton'

import SignPolicy from '@components/SignPolicy'
import SelectContractType from '@components/SelectContractType'
import EnterSeed from '@components/EnterSeed'
import EnterNewPassword from '@components/EnterNewPassword'
import Modal from '@components/Modal'

import './style.scss'

enum LocalStep {
    SIGN_POLICY,
    SELECT_CONTRACT_TYPE,
    ENTER_PHRASE,
    ENTER_PASSWORD,
}

interface IRestoreAccountPage {
    setStep: (step: Step) => void
    createAccount: Action<typeof createAccount>
}

const RestoreAccountPage: React.FC<IRestoreAccountPage> = ({ setStep, createAccount }) => {
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SIGN_POLICY)
    const [error, setError] = useState<string>()

    const [seed, setSeed] = useState<nt.GeneratedMnemonic>()

    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const onSubmit = async (password: string) => {
        try {
            if (seed == null) {
                throw Error('Seed must be specified')
            }

            await createAccount('Account 1', contractType, seed, password)
            setStep(Step.MAIN)
        } catch (e) {
            setError(e.toString())
        }
    }

    const mnemonicType: nt.MnemonicType =
        contractType == 'WalletV3' ? { type: 'legacy' } : { type: 'labs', accountId: 0 }
    const wordCount = contractType === 'WalletV3' ? 24 : 12

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
                        setLocalStep(LocalStep.ENTER_PHRASE)
                    }}
                    onBack={() => setStep(Step.WELCOME)}
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
                            setError(e.toString())
                        }
                    }}
                    onBack={() => setLocalStep(LocalStep.SELECT_CONTRACT_TYPE)}
                    wordCount={wordCount}
                />
            )}
            {localStep == LocalStep.ENTER_PASSWORD && (
                <EnterNewPassword
                    onSubmit={async (password) => {
                        await onSubmit(password)
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
})(RestoreAccountPage)
