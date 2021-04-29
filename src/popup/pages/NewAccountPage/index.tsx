import React, { useState } from 'react'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import { generateSeed } from '@popup/store/app/actions'
import { AccountToCreate } from '@shared/approvalApi'
import * as nt from '@nekoton'

import SignPolicy from '@popup/components/SignPolicy'
import SelectContractType from '@popup/components/SelectContractType'
import ExportedSeed from '@popup/components/ExportedSeed'
import { CheckSeedOnCreation } from '@popup/components/CheckSeed'
import EnterNewPassword from '@popup/components/EnterNewPassword'
import Modal from '@popup/components/Modal'

import './style.scss'

enum LocalStep {
    SIGN_POLICY,
    SELECT_CONTRACT_TYPE,
    SHOW_PHRASE,
    CHECK_PHRASE,
    ENTER_PASSWORD,
}

interface INewAccountPage {
    name: string
    createAccount: (params: AccountToCreate) => Promise<string>
    onBack: () => void
}

const NewAccountPage: React.FC<INewAccountPage> = ({ name, createAccount, onBack }) => {
    const [inProcess, setInProcess] = useState<boolean>(false)
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SIGN_POLICY)
    const [error, setError] = useState<string>()

    const seed = useState<nt.GeneratedMnemonic>(generateSeed())[0]

    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const onSubmit = async (password: string) => {
        try {
            setInProcess(true)
            await createAccount({ name, contractType, seed, password })
        } catch (e) {
            setInProcess(false)
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
                    onBack={onBack}
                />
            )}
            {localStep == LocalStep.SELECT_CONTRACT_TYPE && (
                <SelectContractType
                    onSubmit={(contractType) => {
                        setContractType(contractType)
                        setLocalStep(LocalStep.SHOW_PHRASE)
                    }}
                    onBack={onBack}
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
                    disabled={inProcess}
                    onSubmit={async (password) => {
                        await onSubmit(password)
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

export default NewAccountPage
