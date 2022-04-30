import React, { useState } from 'react'
import { useIntl } from 'react-intl'
import { DEFAULT_CONTRACT_TYPE } from '@popup/common'
import { validateMnemonic } from '@popup/store/app/actions'
import { KeyToRemove, MasterKeyToCreate } from '@shared/backgroundApi'
import * as nt from '@nekoton'

import SignPolicy from '@popup/components/SignPolicy'
import SelectContractType from '@popup/components/SelectContractType'
import { EnterSeedLogin } from '@popup/components/EnterSeed'
import EnterNewPassword from '@popup/components/EnterNewPassword'
import Modal from '@popup/components/Modal'

import './style.scss'
import { parseError } from '@popup/utils'

enum LocalStep {
    // SIGN_POLICY,
    SELECT_CONTRACT_TYPE,
    ENTER_PHRASE,
    ENTER_PASSWORD,
}

interface IRestoreAccountPage {
    name: string
    createMasterKey: (params: MasterKeyToCreate) => Promise<nt.KeyStoreEntry>
    removeKey: (params: KeyToRemove) => Promise<nt.KeyStoreEntry | undefined>
    createAccount: (params: nt.AccountToAdd) => Promise<nt.AssetsList>
    onBack: () => void
}

const ImportAccountPage: React.FC<IRestoreAccountPage> = ({
    name,
    createMasterKey,
    removeKey,
    createAccount,
    onBack,
}) => {
    const intl = useIntl()
    const [inProcess, setInProcess] = useState<boolean>(false)
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SELECT_CONTRACT_TYPE) // LocalStep.SIGN_POLICY
    const [error, setError] = useState<string>()

    const [seed, setSeed] = useState<nt.GeneratedMnemonic>()

    const [contractType, setContractType] = useState<nt.ContractType>(DEFAULT_CONTRACT_TYPE)

    const onSubmit = async (password: string) => {
        let key: nt.KeyStoreEntry | undefined
        try {
            setInProcess(true)
            if (seed == null) {
                throw Error('Seed must be specified')
            }

            key = await createMasterKey({ select: true, seed, password })
            await createAccount({ name, contractType, publicKey: key.publicKey, workchain: 0 })
        } catch (e: any) {
            key && removeKey({ publicKey: key.publicKey }).catch(console.error)
            setInProcess(false)
            setError(parseError(e))
        }
    }

    const mnemonicType: nt.MnemonicType =
        contractType == 'WalletV3' ? { type: 'legacy' } : { type: 'labs', accountId: 0 }
    const wordCount = contractType === 'WalletV3' ? 24 : 12

    return (
        <>
            {/*{localStep == LocalStep.SIGN_POLICY && (*/}
            {/*    <SignPolicy*/}
            {/*        onSubmit={() => {*/}
            {/*            setLocalStep(LocalStep.SELECT_CONTRACT_TYPE)*/}
            {/*        }}*/}
            {/*        onBack={onBack}*/}
            {/*    />*/}
            {/*)}*/}
            {localStep == LocalStep.SELECT_CONTRACT_TYPE && (
                <SelectContractType
                    onSubmit={(contractType) => {
                        setContractType(contractType)
                        setLocalStep(LocalStep.ENTER_PHRASE)
                    }}
                    onBack={onBack}
                />
            )}
            {localStep == LocalStep.ENTER_PHRASE && (
                <EnterSeedLogin
                    onSubmit={(words) => {
                        const phrase = words.join(' ')
                        try {
                            validateMnemonic(phrase, mnemonicType)
                            setSeed({ phrase, mnemonicType })
                            setLocalStep(LocalStep.ENTER_PASSWORD)
                        } catch (e: any) {
                            setError(parseError(e))
                        }
                    }}
                    onBack={() => setLocalStep(LocalStep.SELECT_CONTRACT_TYPE)}
                    wordCount={wordCount}
                />
            )}
            {localStep == LocalStep.ENTER_PASSWORD && (
                <EnterNewPassword
                    disabled={inProcess}
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
                        {intl.formatMessage({ id: 'COULD_NOT_IMPORT_WALLET' })}
                    </h3>
                    <div className="check-seed__content-error">{error}</div>
                </Modal>
            )}
        </>
    )
}

export default ImportAccountPage
