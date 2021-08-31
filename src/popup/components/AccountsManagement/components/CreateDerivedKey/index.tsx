import * as React from 'react'

import { parseError } from '@popup/utils'
import { useRpc } from '@popup/providers/RpcProvider'
import { Step, useAccountability } from '@popup/providers/AccountabilityProvider'
import { EnterPasswordForm, SelectDerivedKeys } from '@popup/components/AccountsManagement/components'

const PUBLIC_KEYS_LIMIT = 100

type PublicKeys = Map<string, number>

enum LocalStep {
    PASSWORD,
    SELECT,
}

export function CreateDerivedKey(): JSX.Element {
    const rpc = useRpc()
    const accountability = useAccountability()
    const { derivedKeys, currentMasterKey, accounts, selectedAccount } = accountability
    const [password, setPassword] = React.useState<string | undefined>()
    const [passwordError, setPasswordError] = React.useState<string | undefined>()
    const [selectKeysError, setSelectKeysError] = React.useState<string | undefined>()
    const [publicKeys, setPublicKeys] = React.useState<PublicKeys>(new Map())
    const [inProcess, setInProcess] = React.useState<boolean>(false)
    const [localStep, setLocalStep] = React.useState<LocalStep>(LocalStep.PASSWORD)

    const goToManageSeed = () => {
        accountability.setStep(Step.MANAGE_SEED)
    }

    const onSubmitPassword = async (password: string) => {
        if (currentMasterKey == null) {
            return
        }

        setInProcess(true)

        try {
            await rpc
                .getPublicKeys({
                    type: 'master_key',
                    data: {
                        password,
                        offset: 0,
                        limit: PUBLIC_KEYS_LIMIT,
                        masterKey: currentMasterKey.masterKey,
                    }
                })
                .then((rawPublicKeys) => {
                    setPublicKeys(new Map(rawPublicKeys.map((key, i) => [key, i])))
                    setPassword(password)
                    setInProcess(false)
                    setLocalStep(LocalStep.SELECT)
                })
                .catch(e => {
                    setPasswordError(parseError(e))
                    setInProcess(false)
                })
        } catch (e) {
            setPasswordError(parseError(e))
            setInProcess(false)
        }
    }

    const onSubmitKeys = async (selectedKeys: PublicKeys) => {
        if (!currentMasterKey || !password) {
            return
        }

        setInProcess(true)

        const { masterKey } = currentMasterKey
        const currentKeysIds = derivedKeys.map(({ accountId }) => accountId)
        const selectedKeysIds = [...selectedKeys.values()]
        const keysIdsToCreate = selectedKeysIds
            .filter(accountId => !currentKeysIds.includes(accountId))
        const keyIdsToRemove = currentKeysIds
            .filter(accountId => !selectedKeysIds.includes(accountId))
        const keysToRemove = [...publicKeys.entries()]
            .filter(([, accountId]) => keyIdsToRemove.includes(accountId))
            .map(([publicKey]) => publicKey)
        const paramsToCreate = keysIdsToCreate
            .map(accountId => ({ password, accountId, masterKey }))
        const paramsToRemove = keysToRemove.map(publicKey => ({ publicKey }))
        const accountsToRemove = accounts
            .filter(({ tonWallet: { publicKey } }) => keysToRemove.includes(publicKey))
            .map(({ tonWallet: { address } }) => address)

        try {
            if (paramsToCreate.length) {
                await rpc.createDerivedKeys(paramsToCreate)
            }

            if (accountsToRemove.length) {
                await rpc.removeAccounts(accountsToRemove)
            }

            if (paramsToRemove.length) {
                await rpc.removeKeys(paramsToRemove)
            }
        } catch (e) {
            setSelectKeysError(parseError(e))
        }

        setInProcess(false)
        goToManageSeed()
    }

    return (
        <>
            {localStep === LocalStep.PASSWORD && (
                <EnterPasswordForm
                    title="Add keys"
                    onSubmit={onSubmitPassword}
                    onBack={goToManageSeed}
                    inProcess={inProcess}
                    error={passwordError}
                />
            )}

            {localStep === LocalStep.SELECT && selectedAccount && (
                <SelectDerivedKeys
                    onSubmit={onSubmitKeys}
                    publicKeys={publicKeys}
                    error={selectKeysError}
                    inProcess={inProcess}
                    preselectedKey={selectedAccount.tonWallet.publicKey}
                />
            )}
        </>
    )
}
