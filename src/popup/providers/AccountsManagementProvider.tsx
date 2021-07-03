import * as React from 'react'

import * as nt from '@nekoton'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import { AccountToCreate, KeyToDerive, MasterKeyToCreate } from '@shared/backgroundApi'
import { TokenWalletState } from '@shared/utils'

export enum Step {
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

type AccountsManagementContext = {
    currentAccount?: nt.AssetsList
    setCurrentAccount: React.Dispatch<React.SetStateAction<nt.AssetsList | undefined>>
    currentDerivedKey?: nt.KeyStoreEntry
    setCurrentDerivedKey: React.Dispatch<React.SetStateAction<nt.KeyStoreEntry | undefined>>
    currentMasterKey?: nt.KeyStoreEntry
    setCurrentMasterKey: React.Dispatch<React.SetStateAction<nt.KeyStoreEntry | undefined>>
    nextAccountId: number
    recentMasterKeys: nt.KeyStoreEntry[]
    masterKeys: nt.KeyStoreEntry[]
    masterKeysNames: { [masterKey: string]: string }
    selectedMasterKey?: string
    derivedKeys: nt.KeyStoreEntry[]
    derivedKeysNames: { [publicKey: string]: string }
    selectedAccount?: nt.AssetsList
    accounts: nt.AssetsList[]
    derivedKeyRelatedAccounts: nt.AssetsList[]
    accountsVisibility: { [address: string]: boolean }
    accountAddress?: string
    accountName?: string
    tonWalletState?: nt.ContractState
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    step: Step | null
    setStep: React.Dispatch<React.SetStateAction<Step | null>>
    onManageMasterKey(seed: nt.KeyStoreEntry): void
    onCreateMasterKey(params: MasterKeyToCreate): Promise<void>
    onManageDerivedKey(derivedKey: nt.KeyStoreEntry): void
    onCreateDerivedKey(params: KeyToDerive): Promise<void>
    onManageAccount(account: nt.AssetsList): void
    onCreateAccount(params: AccountToCreate): Promise<void>
    reset(): void
    logOut(): Promise<void>
}

export const Context = React.createContext<AccountsManagementContext>({
    setCurrentAccount() {},
    setCurrentDerivedKey() {},
    setCurrentMasterKey() {},
    nextAccountId: 0,
    recentMasterKeys: [],
    masterKeys: [],
    masterKeysNames: {},
    derivedKeys: [],
    derivedKeysNames: {},
    derivedKeyRelatedAccounts: [],
    selectedAccount: {} as nt.AssetsList,
    accounts: [],
    accountsVisibility: {},
    tokenWalletStates: {},
    step: null,
    setStep() {},
    onManageMasterKey() {},
    async onCreateMasterKey() {},
    onManageDerivedKey() {},
    async onCreateDerivedKey() {},
    onManageAccount() {},
    async onCreateAccount() {},
    reset() {},
    async logOut() {},
})

export function useAccountsManagement() {
    return React.useContext(Context)
}

export function AccountsManagementProvider({ children }: Props): JSX.Element {
    const rpc = useRpc()
    const rpcState = useRpcState()

    // Local states
    const [currentAccount, setCurrentAccount] = React.useState<nt.AssetsList>()
    const [currentDerivedKey, setCurrentDerivedKey] = React.useState<nt.KeyStoreEntry>()
    const [currentMasterKey, setCurrentMasterKey] = React.useState<nt.KeyStoreEntry>()
    const [step, setStep] = React.useState<Step | null>(null)

    // Seed
    const masterKeys = React.useMemo(
        () => Object.values({ ...rpcState.state?.storedKeys }).filter((key) => key.accountId === 0),
        [rpcState.state?.storedKeys]
    )

    const onManageMasterKey = (seed: nt.KeyStoreEntry) => {
        setCurrentMasterKey(seed)
        setStep(Step.MANAGE_SEED)
    }

    const onCreateMasterKey = async (params: MasterKeyToCreate) => {
        await rpc.createMasterKey(params).then(onManageMasterKey)
    }

    // Derived keys
    const derivedKeys = React.useMemo(
        () =>
            Object.values({ ...rpcState.state?.storedKeys }).filter(
                (key) => key.masterKey === currentMasterKey?.masterKey
            ),
        [currentMasterKey, rpcState.state?.storedKeys]
    )

    const derivedKeyRelatedAccounts = React.useMemo(() => {
        return currentDerivedKey
            ? rpcState.state?.accountEntries[currentDerivedKey.publicKey] || []
            : []
    }, [currentDerivedKey, rpcState.state?.accountEntries])

    const onManageDerivedKey = (derivedKey: nt.KeyStoreEntry) => {
        setCurrentDerivedKey(derivedKey)
        setStep(Step.MANAGE_DERIVED_KEY)
    }

    const onCreateDerivedKey = async (params: KeyToDerive) => {
        await rpc.createDerivedKey(params).then(onManageDerivedKey)
    }

    // Accounts
    const accounts = React.useMemo(() => {
        const derivedKeysPubKeys = Object.values({
            ...rpcState.state?.storedKeys,
        })
            .filter((key) => key.masterKey === rpcState.state?.selectedMasterKey)
            .map((key) => key.publicKey)
        const availableAccounts: nt.AssetsList[] = []
        derivedKeysPubKeys.forEach((publicKey) => {
            if (rpcState.state?.accountEntries[publicKey] !== undefined) {
                availableAccounts.push(...rpcState.state?.accountEntries[publicKey])
            }
        })
        return availableAccounts.filter((account) =>
            account.tonWallet !== undefined
                ? rpcState.state?.accountsVisibility[account.tonWallet.address]
                : false
        )
    }, [
        rpcState.state?.accountEntries,
        rpcState.state?.accountsVisibility,
        rpcState.state?.selectedMasterKey,
        rpcState.state?.storedKeys,
    ])

    const accountAddress = React.useMemo(() => rpcState.state?.selectedAccount?.tonWallet.address, [
        rpcState.state?.selectedAccount,
    ])

    const accountName = React.useMemo(() => rpcState.state?.selectedAccount?.name, [
        rpcState.state?.selectedAccount,
    ])

    const nextAccountId = React.useMemo(() => {
        const ids = Object.values({ ...rpcState.state?.storedKeys }).map(
            ({ accountId }) => accountId
        )
        return Math.max(...ids) + 1
    }, [rpcState.state?.accountEntries, rpcState.state?.storedKeys])

    const onManageAccount = (account: nt.AssetsList) => {
        setCurrentAccount(account)
        setStep(Step.MANAGE_ACCOUNT)
    }

    const onCreateAccount = async (params: AccountToCreate) => {
        await rpc.createAccount(params).then(onManageAccount)
    }

    const tonWalletState = React.useMemo(
        () =>
            accountAddress !== undefined
                ? rpcState.state?.accountContractStates?.[accountAddress]
                : undefined,
        [rpcState.state?.accountContractStates, accountAddress]
    )

    const tokenWalletStates = React.useMemo(
        () =>
            accountAddress !== undefined
                ? rpcState.state?.accountTokenStates?.[accountAddress] || {}
                : {},
        [rpcState.state?.accountTokenStates, accountAddress]
    )

    const reset = () => {
        setStep(null)
        setCurrentAccount(undefined)
        setCurrentDerivedKey(undefined)
        setCurrentMasterKey(undefined)
    }

    const logOut = async () => {
        await rpc.logOut()
        window.close()
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
                masterKeys,
                masterKeysNames: rpcState.state?.masterKeysNames || {},
                recentMasterKeys: [],
                derivedKeys,
                derivedKeysNames: rpcState.state?.derivedKeysNames || {},
                derivedKeyRelatedAccounts,
                selectedAccount: rpcState.state?.selectedAccount,
                selectedMasterKey: rpcState.state?.selectedMasterKey,
                accounts,
                accountsVisibility: rpcState.state?.accountsVisibility || {},
                accountAddress,
                accountName,
                nextAccountId,
                tonWalletState,
                tokenWalletStates,
                reset,
                logOut,
                onManageMasterKey,
                onCreateMasterKey,
                onManageDerivedKey,
                onCreateDerivedKey,
                onManageAccount,
                onCreateAccount,
            }}
        >
            {children}
        </Context.Provider>
    )
}
