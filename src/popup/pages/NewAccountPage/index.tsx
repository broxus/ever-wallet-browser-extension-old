import React, { useState } from 'react'
import { useIntl } from 'react-intl'
import { generateSeed } from '@popup/store/app/actions'
import * as nt from '@nekoton'

import { useRpc } from '@popup/providers/RpcProvider'
import ExportedSeed from '@popup/components/ExportedSeed'
import { CheckSeedOnCreation } from '@popup/components/CheckSeed'
import EnterNewPassword from '@popup/components/EnterNewPassword'
import Modal from '@popup/components/Modal'
import { parseError } from '@popup/utils'
import { DEFAULT_WALLET_TYPE } from '@shared/contracts'

enum LocalStep {
    SHOW_PHRASE,
    CHECK_PHRASE,
    ENTER_PASSWORD,
}

interface INewAccountPage {
    name: string
    onBack: () => void
}

const NewAccountPage: React.FC<INewAccountPage> = ({ name, onBack }) => {
    const intl = useIntl()
    const rpc = useRpc()
    const [inProcess, setInProcess] = useState<boolean>(false)
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.SHOW_PHRASE)
    const [error, setError] = useState<string>()

    const seed = useState<nt.GeneratedMnemonic>(generateSeed())[0]

    const onSubmit = async (password: string) => {
        let key: nt.KeyStoreEntry | undefined
        try {
            setInProcess(true)

            key = await rpc.createMasterKey({
                select: true,
                seed,
                password,
            })
            await rpc.createAccount({
                name,
                publicKey: key.publicKey,
                contractType: DEFAULT_WALLET_TYPE,
                workchain: 0,
            })
        } catch (e: any) {
            key && rpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
            setInProcess(false)
            setError(parseError(e))
        }
    }

    const splitSeed = seed.phrase.split(' ')

    return (
        <>
            {localStep == LocalStep.SHOW_PHRASE && (
                <ExportedSeed
                    onBack={onBack}
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
                        {intl.formatMessage({
                            id: 'COULD_NOT_CREATE_WALLET',
                        })}
                    </h3>
                    <div className="check-seed__content-error">{error}</div>
                </Modal>
            )}
        </>
    )
}

export default NewAccountPage
