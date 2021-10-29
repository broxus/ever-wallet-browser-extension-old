import React, { useState } from 'react'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import { generateSeed } from '@popup/store/app/actions'
import { AccountToCreate, KeyToRemove, MasterKeyToCreate } from '@shared/backgroundApi'
import * as nt from '@nekoton'

import SignPolicy from '@popup/components/SignPolicy'
import SelectContractType from '@popup/components/SelectContractType'
import ExportedSeed from '@popup/components/ExportedSeed'
import { CheckSeedOnCreation } from '@popup/components/CheckSeed'
import EnterNewPassword from '@popup/components/EnterNewPassword'
import Modal from '@popup/components/Modal'
import { parseError } from '@popup/utils'

enum LocalStep {
    SIGN_POLICY,
    SELECT_CONTRACT_TYPE,
    SHOW_PHRASE,
    CHECK_PHRASE,
    ENTER_PASSWORD,
}

interface INewAccountPage {
    name: string
    createMasterKey: (params: MasterKeyToCreate) => Promise<nt.KeyStoreEntry>
    removeKey: (params: KeyToRemove) => Promise<nt.KeyStoreEntry | undefined>
    createAccount: (params: AccountToCreate) => Promise<nt.AssetsList>
    onBack: () => void
}

const NewAccountPage: React.FC<INewAccountPage> = ({
    name,
    createMasterKey,
    removeKey,
    createAccount,
    onBack,
}) => {
    const [inProcess, setInProcess] = useState<boolean>(false)
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SIGN_POLICY)
    const [error, setError] = useState<string>()

    const seed = useState<nt.GeneratedMnemonic>(generateSeed())[0]

    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const onSubmit = async (password: string) => {
        let key: nt.KeyStoreEntry | undefined
        try {
            setInProcess(true)

            key = await createMasterKey({
                select: true,
                seed,
                password,
            })
            await createAccount({ name, publicKey: key.publicKey, contractType, workchain: 0 })
        } catch (e: any) {
            key && removeKey({ publicKey: key.publicKey }).catch(console.error)
            setInProcess(false)
            setError(parseError(e))
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
