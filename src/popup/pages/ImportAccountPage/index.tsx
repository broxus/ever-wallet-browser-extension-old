import React, { useState } from 'react'
import { useIntl } from 'react-intl'
import { validateMnemonic } from '@popup/store/app/actions'
import * as nt from '@nekoton'

import { EnterSeedLogin } from '@popup/components/EnterSeed'
import EnterNewPassword from '@popup/components/EnterNewPassword'
import Modal from '@popup/components/Modal'

import './style.scss'
import { parseError } from '@popup/utils'
import { useRpc } from '@popup/providers/RpcProvider'
import { DEFAULT_WALLET_TYPE, ACCOUNTS_TO_SEARCH, CONTRACT_TYPE_NAMES } from '@shared/contracts'

enum LocalStep {
    ENTER_PHRASE,
    ENTER_PASSWORD,
}

interface IRestoreAccountPage {
    name: string
    onBack: () => void
}

const ImportAccountPage: React.FC<IRestoreAccountPage> = ({ name, onBack }) => {
    const intl = useIntl()
    const rpc = useRpc()
    const [inProcess, setInProcess] = useState<boolean>(false)
    const [localStep, setLocalStep] = useState<LocalStep>(LocalStep.ENTER_PHRASE)
    const [error, setError] = useState<string>()

    const [seed, setSeed] = useState<nt.GeneratedMnemonic>()

    const onSubmit = async (password: string) => {
        let key: nt.KeyStoreEntry | undefined
        try {
            setInProcess(true)
            if (seed == null) {
                throw Error('Seed must be specified')
            }

            key = await rpc.createMasterKey({ select: true, seed, password })

            const existingWallets = await rpc.findExistingWallets({
                publicKey: key.publicKey,
                contractTypes: ACCOUNTS_TO_SEARCH,
                workchainId: 0,
            })

            const makeAccountName = (type: nt.ContractType) =>
                type === DEFAULT_WALLET_TYPE ? name : `${name} (${CONTRACT_TYPE_NAMES[type]})`

            const accountsToAdd = existingWallets
                .filter(
                    (wallet) =>
                        wallet.contractState.isDeployed || wallet.contractState.balance !== '0'
                )
                .map<nt.AccountToAdd>((wallet) => ({
                    name: makeAccountName(wallet.contractType),
                    publicKey: wallet.publicKey,
                    contractType: wallet.contractType,
                    workchain: 0,
                }))
            if (accountsToAdd.length === 0) {
                accountsToAdd.push({
                    name: makeAccountName(DEFAULT_WALLET_TYPE),
                    publicKey: key.publicKey,
                    contractType: DEFAULT_WALLET_TYPE,
                    workchain: 0,
                })
            }
            await rpc.createAccounts(accountsToAdd)
            await rpc.ensureAccountSelected()
        } catch (e: any) {
            key && rpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
            setInProcess(false)
            setError(parseError(e))
        }
    }

    return (
        <>
            {localStep == LocalStep.ENTER_PHRASE && (
                <EnterSeedLogin
                    onSubmit={async (mnemonicType, phrase) => {
                        if (inProcess) {
                            return
                        }
                        setInProcess(true)
                        try {
                            validateMnemonic(phrase, mnemonicType)
                            setSeed({ phrase, mnemonicType })
                            setLocalStep(LocalStep.ENTER_PASSWORD)
                        } catch (e: any) {
                            setError(parseError(e))
                        } finally {
                            setInProcess(false)
                        }
                    }}
                    onBack={onBack}
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
