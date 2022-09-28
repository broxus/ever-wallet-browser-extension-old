import * as React from 'react'
import _ from 'lodash'

import * as nt from '@nekoton'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { TokenWalletState } from '@shared/utils'

export enum Step {
    MANAGE_SEEDS,
    MANAGE_SEED,
    CREATE_SEED,
    MANAGE_DERIVED_KEY,
    CREATE_DERIVED_KEY,
    MANAGE_ACCOUNT,
    CREATE_ACCOUNT,
}

type Props = {
    children: React.ReactNode
}

export interface AccountabilityContext {
    currentAccount: nt.AssetsList | undefined
    setCurrentAccount: React.Dispatch<React.SetStateAction<nt.AssetsList | undefined>>
    currentDerivedKey: nt.KeyStoreEntry | undefined
    setCurrentDerivedKey: React.Dispatch<React.SetStateAction<nt.KeyStoreEntry | undefined>>
    currentMasterKey: nt.KeyStoreEntry | undefined
    setCurrentMasterKey: React.Dispatch<React.SetStateAction<nt.KeyStoreEntry | undefined>>
    step: Step | null
    setStep: React.Dispatch<React.SetStateAction<Step>>
    nextAccountId: number
    masterKeys: nt.KeyStoreEntry[]
    masterKeysNames: { [masterKey: string]: string }
    recentMasterKeys: nt.KeyStoreEntry[]
    selectedMasterKey: string | undefined
    currentDerivedKeyAccounts: nt.AssetsList[]
    currentDerivedKeyExternalAccounts: nt.AssetsList[]
    derivedKeys: nt.KeyStoreEntry[]
    accounts: nt.AssetsList[]
    accountsVisibility: { [address: string]: boolean }
    selectedAccount: nt.AssetsList | undefined
    selectedAccountAddress: string | undefined
    selectedAccountPublicKey: string | undefined
    contractTypeDetails: nt.TonWalletDetails | undefined
    tonWalletState: nt.ContractState | undefined
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    logOut(): Promise<void>
    reset(): void
    onManageMasterKey(value?: nt.KeyStoreEntry): void
    onManageDerivedKey(value?: nt.KeyStoreEntry): void
    onManageAccount(value?: nt.AssetsList): void
}

export const Context = React.createContext<AccountabilityContext>({
    currentAccount: undefined,
    setCurrentAccount() {},
    currentDerivedKey: undefined,
    setCurrentDerivedKey() {},
    currentMasterKey: undefined,
    setCurrentMasterKey() {},
    step: null,
    setStep() {},
    nextAccountId: 0,
    masterKeys: [],
    masterKeysNames: {},
    recentMasterKeys: [],
    selectedMasterKey: undefined,
    currentDerivedKeyAccounts: [],
    currentDerivedKeyExternalAccounts: [],
    derivedKeys: [],
    accounts: [],
    accountsVisibility: {},
    selectedAccount: undefined,
    selectedAccountAddress: undefined,
    selectedAccountPublicKey: undefined,
    contractTypeDetails: undefined,
    tonWalletState: undefined,
    tokenWalletStates: {},
    async logOut() {},
    reset() {},
    onManageMasterKey() {},
    onManageDerivedKey() {},
    onManageAccount() {},
})

export function useAccountability() {
    return React.useContext(Context)
}

export function AccountabilityProvider({ children }: Props): JSX.Element {
    const rpc = useRpc()
    const rpcState = useRpcState()

    // Local states
    const [currentAccount, setCurrentAccount] = React.useState<nt.AssetsList>()
    const [currentDerivedKey, setCurrentDerivedKey] = React.useState<nt.KeyStoreEntry>()
    const [currentMasterKey, setCurrentMasterKey] = React.useState<nt.KeyStoreEntry>()
    const [step, setStep] = React.useState<Step>(Step.MANAGE_SEEDS)

    // All available keys includes master key
    const masterKeys = React.useMemo(
        () =>
            _.uniqBy(
                window.ObjectExt.values({ ...rpcState.state.storedKeys }),
                ({ masterKey }) => masterKey
            ),
        [rpcState.state.storedKeys]
    )

    const onManageMasterKey = (value?: nt.KeyStoreEntry) => {
        setCurrentMasterKey(value)
        setStep(Step.MANAGE_SEED)
    }

    // All direct derived keys in managed seed
    const derivedKeys = React.useMemo(
        () =>
            window.ObjectExt.values({ ...rpcState.state.storedKeys }).filter(
                (key) => key.masterKey === currentMasterKey?.masterKey
            ),
        [currentMasterKey, rpcState.state.storedKeys]
    )

    // All related accounts in managed derived key
    const currentDerivedKeyAccounts = React.useMemo(() => {
        if (currentDerivedKey == null) {
            return []
        }

        return window.ObjectExt.values({ ...rpcState.state.accountEntries }).filter(
            (entry) => entry.tonWallet.publicKey === currentDerivedKey.publicKey
        )
    }, [currentDerivedKey, rpcState.state.accountEntries, rpcState.state.storedKeys])

    // All linked external accounts in managed derived key
    const currentDerivedKeyExternalAccounts = React.useMemo(() => {
        if (currentDerivedKey) {
            const externalAccounts = rpcState.state.externalAccounts.filter((account) =>
                account.externalIn.includes(currentDerivedKey.publicKey)
            )
            const accounts: nt.AssetsList[] = []
            externalAccounts?.forEach((account) => {
                const entry = rpcState.state.accountEntries[account.address]
                if (entry !== undefined) {
                    accounts.push(entry)
                }
            })
            return accounts
        }
        return []
    }, [currentDerivedKey, rpcState.state.accountEntries, rpcState.state.storedKeys])

    const onManageDerivedKey = (derivedKey?: nt.KeyStoreEntry) => {
        setCurrentDerivedKey(derivedKey)
        setStep(Step.MANAGE_DERIVED_KEY)
    }

    const derivedKeysPubKeys = React.useMemo(
        () =>
            window.ObjectExt.values({ ...rpcState.state.storedKeys })
                .filter((key) => key.masterKey === rpcState.state.selectedMasterKey)
                .map((key) => key.publicKey),
        [rpcState.state.storedKeys, rpcState.state.selectedMasterKey]
    )

    // All available accounts of the selected seed
    const internalAccounts = React.useMemo(() => {
        const accounts: { [address: string]: nt.AssetsList } = {}

        window.ObjectExt.values({ ...rpcState.state.accountEntries }).forEach((entry) => {
            if (
                derivedKeysPubKeys.includes(entry.tonWallet.publicKey) &&
                accounts[entry.tonWallet.address] == null
            ) {
                accounts[entry.tonWallet.address] = entry
            }
        })

        return accounts
    }, [derivedKeysPubKeys, rpcState.state.accountEntries])

    const accounts = React.useMemo(() => {
        const externalAccounts: { [address: string]: nt.AssetsList } = { ...internalAccounts }

        rpcState.state.externalAccounts.forEach(({ address, externalIn }) => {
            derivedKeysPubKeys.forEach((key) => {
                if (externalIn.includes(key)) {
                    const entry = rpcState.state.accountEntries[address]
                    if (entry != null && externalAccounts[entry.tonWallet.address] == null) {
                        externalAccounts[entry.tonWallet.address] = entry
                    }
                }
            })
        })

        return window.ObjectExt.values(externalAccounts)
            .filter((account) =>
                account.tonWallet !== undefined
                    ? rpcState.state.accountsVisibility[account.tonWallet.address]
                    : false
            )
            .sort((a, b) => {
                if (a.name < b.name) return -1
                if (a.name > b.name) return 1
                return 0
            })
    }, [
        derivedKeysPubKeys,
        internalAccounts,
        rpcState.state.accountEntries,
        rpcState.state.accountsVisibility,
        rpcState.state.externalAccounts,
        rpcState.state.selectedMasterKey,
        rpcState.state.storedKeys,
    ])

    const selectedAccountAddress = React.useMemo(
        () => rpcState.state.selectedAccount?.tonWallet.address,
        [rpcState.state.selectedAccount?.tonWallet.address]
    )

    const selectedAccountPublicKey = React.useMemo(
        () => rpcState.state.selectedAccount?.tonWallet.publicKey,
        [rpcState.state.selectedAccount?.tonWallet.publicKey]
    )

    // TON Wallet contract state of selected account
    const tonWalletState = React.useMemo(
        () =>
            selectedAccountAddress !== undefined
                ? rpcState.state.accountContractStates[selectedAccountAddress]
                : undefined,
        [selectedAccountAddress, rpcState.state?.accountContractStates]
    )

    // Token Wallet state of selected account
    const tokenWalletStates = React.useMemo(
        () =>
            selectedAccountAddress !== undefined
                ? rpcState.state.accountTokenStates?.[selectedAccountAddress] || {}
                : {},
        [selectedAccountAddress, rpcState.state?.accountTokenStates]
    )

    const contractTypeDetails = React.useMemo(() => {
        if (rpcState.state.selectedAccount == null) {
            return undefined
        }

        const details = rpcState.state.accountDetails[
            rpcState.state.selectedAccount.tonWallet.address
        ] as nt.TonWalletDetails | undefined

        return details != null
            ? details
            : nt.getContractTypeDefaultDetails(
                  rpcState.state.selectedAccount.tonWallet.contractType
              )
    }, [rpcState, selectedAccountAddress])

    const nextAccountId = React.useMemo(() => {
        if (currentMasterKey == null) {
            return 0
        }

        const accountIds = window.ObjectExt.values({ ...rpcState.state.storedKeys })
            .filter((key) => key.masterKey === currentMasterKey.masterKey)
            .map((key) => key.accountId)
            .sort((a, b) => a - b)

        let nextAccountId = 0
        for (let i = 0; i < accountIds.length; ++i) {
            if (nextAccountId != accountIds[i]) {
                break
            }
            ++nextAccountId
        }

        return nextAccountId
    }, [rpcState.state.storedKeys, currentMasterKey])

    const onManageAccount = (account?: nt.AssetsList) => {
        setCurrentAccount(account)
        setStep(Step.MANAGE_ACCOUNT)
    }

    const logOut = async () => {
        await rpc.logOut()
        window.close()
    }

    const reset = () => {
        setStep(Step.MANAGE_SEEDS)
        setCurrentAccount(undefined)
        setCurrentDerivedKey(undefined)
        setCurrentMasterKey(undefined)
    }

    React.useEffect(() => {
        ;(async () => {
            const key = window.ObjectExt.values({
                ...rpcState.state.storedKeys,
            }).find(({ masterKey }) => masterKey === rpcState.state.selectedMasterKey)

            if (key !== undefined) {
                await rpc.updateRecentMasterKey(key)
            }
        })()
    }, [rpcState.state.selectedMasterKey])

    React.useEffect(() => {
        window.ObjectExt.keys({ ...rpcState.state.accountEntries }).forEach(async (address) => {
            if (rpcState.state.accountsVisibility[address] == null) {
                await rpc.updateAccountVisibility(address as string, true)
            }
        })
    }, [])

    if (process.env.NODE_ENV !== 'production') {
        console.log('ACCOUNTABILITY', {
            currentAccount,
            currentDerivedKey,
            currentMasterKey,
            step,
            setStep,
            masterKeys,
            masterKeysNames: rpcState.state.masterKeysNames || {},
            recentMasterKeys: rpcState.state.recentMasterKeys || [],
            currentDerivedKeyAccounts,
            currentDerivedKeyExternalAccounts,
            derivedKeys,
            selectedAccount: rpcState.state.selectedAccount,
            selectedMasterKey: rpcState.state.selectedMasterKey,
            accounts,
            accountsVisibility: rpcState.state.accountsVisibility || {},
            selectedAccountAddress,
            selectedAccountPublicKey,
            nextAccountId,
            tonWalletState,
            tokenWalletStates,
        })
    }

    return (
        <Context.Provider
            value={{
                currentAccount,
                setCurrentAccount,
                currentDerivedKey,
                setCurrentDerivedKey,
                currentMasterKey,
                setCurrentMasterKey,
                step,
                setStep,
                nextAccountId,
                masterKeys,
                masterKeysNames: rpcState.state.masterKeysNames || {},
                recentMasterKeys: rpcState.state.recentMasterKeys || [],
                selectedMasterKey: rpcState.state.selectedMasterKey,
                currentDerivedKeyExternalAccounts,
                currentDerivedKeyAccounts,
                derivedKeys,
                accounts,
                accountsVisibility: rpcState.state.accountsVisibility || {},
                selectedAccount: rpcState.state.selectedAccount,
                selectedAccountAddress,
                selectedAccountPublicKey,
                contractTypeDetails,
                tonWalletState,
                tokenWalletStates,
                logOut,
                reset,
                onManageMasterKey,
                onManageDerivedKey,
                onManageAccount,
            }}
        >
            {children}
        </Context.Provider>
    )
}
