import * as React from 'react'

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

interface AccountabilityContext {
    currentAccount?: nt.AssetsList;
    setCurrentAccount: React.Dispatch<React.SetStateAction<nt.AssetsList | undefined>>;
    currentDerivedKey?: nt.KeyStoreEntry;
    setCurrentDerivedKey: React.Dispatch<React.SetStateAction<nt.KeyStoreEntry | undefined>>;
    currentMasterKey?: nt.KeyStoreEntry;
    setCurrentMasterKey: React.Dispatch<React.SetStateAction<nt.KeyStoreEntry | undefined>>;
    nextAccountId: number;
    recentMasterKeys: nt.KeyStoreEntry[];
    masterKeys: nt.KeyStoreEntry[];
    masterKeysNames: { [masterKey: string]: string };
    selectedMasterKey?: string;
    derivedKeys: nt.KeyStoreEntry[];
    derivedKeysNames: { [publicKey: string]: string };
    derivedKeyRelatedAccounts: nt.AssetsList[];
    derivedKeyExternalAccounts: nt.AssetsList[];
    selectedAccount?: nt.AssetsList;
    accounts: nt.AssetsList[];
    accountsVisibility: { [address: string]: boolean };
    selectedAccountAddress?: string;
    selectedAccountPublicKey?: string;
    tonWalletState?: nt.ContractState;
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState };
    step: Step | null;
    setStep: React.Dispatch<React.SetStateAction<Step>>;
    logOut(): Promise<void>;
    reset(): void;
    onManageMasterKey(value?: nt.KeyStoreEntry): void;
    onManageDerivedKey(value?: nt.KeyStoreEntry): void;
    onManageAccount(value?: nt.AssetsList): void;
}

export const Context = React.createContext<AccountabilityContext>({
    setCurrentAccount() {},
    setCurrentDerivedKey() {},
    setCurrentMasterKey() {},
    step: null,
    setStep() {},
    nextAccountId: 0,
    recentMasterKeys: [],
    masterKeys: [],
    masterKeysNames: {},
    derivedKeys: [],
    derivedKeysNames: {},
    derivedKeyRelatedAccounts: [],
    derivedKeyExternalAccounts: [],
    selectedAccount: {} as nt.AssetsList,
    accounts: [],
    accountsVisibility: {},
    tokenWalletStates: {},
    onManageMasterKey() {},
    onManageDerivedKey() {},
    onManageAccount() {},
    async logOut() {},
    reset() {},
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

    // Seed
    const masterKeys = React.useMemo(
        () => Object.values({ ...rpcState.state?.storedKeys }).filter((key) => key.accountId === 0),
        [rpcState.state?.storedKeys]
    )

    const onManageMasterKey = (value?: nt.KeyStoreEntry) => {
        setCurrentMasterKey(value)
        setStep(Step.MANAGE_SEED)
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
            ? rpcState.state?.accountEntries[currentDerivedKey?.publicKey] || []
            : []
    }, [currentDerivedKey, rpcState.state?.accountEntries, rpcState.state?.storedKeys])

    const derivedKeyExternalAccounts = React.useMemo(() => {
        if (currentDerivedKey) {
            const externalAccounts = rpcState.state?.externalAccountEntries.filter(
                (account) => account.externalIn.includes(currentDerivedKey.publicKey)
            )
            const accounts: nt.AssetsList[] = []
            externalAccounts?.forEach((account) => {
                const entry = rpcState.state?.accountEntries[account.publicKey]?.find(
                    ({ tonWallet }) => tonWallet.publicKey === account.publicKey
                )
                if (entry !== undefined) {
                    accounts.push(entry)
                }
            })
            return accounts
        }
        return []
    }, [currentDerivedKey, rpcState.state?.accountEntries, rpcState.state?.storedKeys])

    const onManageDerivedKey = (derivedKey?: nt.KeyStoreEntry) => {
        setCurrentDerivedKey(derivedKey)
        setStep(Step.MANAGE_DERIVED_KEY)
    }

    // Accounts
    const accounts = React.useMemo(() => {
        const derivedKeysPubKeys = Object.values({ ...rpcState.state?.storedKeys })
            .filter((key) => key.masterKey === rpcState.state?.selectedMasterKey)
            .map((key) => key.publicKey)

        const availableAccounts: nt.AssetsList[] = []

        derivedKeysPubKeys.forEach((publicKey) => {
            if (rpcState.state?.accountEntries[publicKey] !== undefined) {
                availableAccounts.push(...rpcState.state?.accountEntries[publicKey])
            }
        })

        rpcState.state?.externalAccountEntries.forEach(({ address, publicKey }) => {
            if (rpcState.state?.accountEntries[publicKey] !== undefined) {
                rpcState.state?.accountEntries[publicKey].forEach((account) => {
                    if (account.tonWallet.address === address) {
                        availableAccounts.push(account)
                    }
                })
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
        rpcState.state?.externalAccountEntries,
        rpcState.state?.selectedMasterKey,
        rpcState.state?.storedKeys,
    ])

    const selectedAccountAddress = React.useMemo(
        () => rpcState.state?.selectedAccount?.tonWallet.address,
        [rpcState.state?.selectedAccount]
    )

    const selectedAccountPublicKey = React.useMemo(
        () => rpcState.state?.selectedAccount?.tonWallet.publicKey,
        [rpcState.state?.selectedAccount]
    )

    const tonWalletState = React.useMemo(
        () =>
            selectedAccountAddress !== undefined
                ? rpcState.state?.accountContractStates?.[selectedAccountAddress]
                : undefined,
        [selectedAccountAddress, rpcState.state?.accountContractStates]
    )

    const tokenWalletStates = React.useMemo(
        () =>
            selectedAccountAddress !== undefined
                ? rpcState.state?.accountTokenStates?.[selectedAccountAddress] || {}
                : {},
        [selectedAccountAddress, rpcState.state?.accountTokenStates]
    )

    // fix
    const nextAccountId = React.useMemo(() => derivedKeys.length, [currentDerivedKey, rpcState.state?.accountEntries])

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
        (async () => {
            const key = Object.values({
                ...rpcState.state?.storedKeys,
            }).find(({ masterKey }) => masterKey === rpcState.state?.selectedMasterKey)

            if (key !== undefined) {
                await rpc.updateRecentMasterKey(key)
            }
        })()
    }, [rpcState.state?.selectedMasterKey])

    console.log('STATE', {
        currentAccount,
        currentDerivedKey,
        currentMasterKey,
        step,
        setStep,
        masterKeys,
        masterKeysNames: rpcState.state?.masterKeysNames || {},
        recentMasterKeys: rpcState.state?.recentMasterKeys || [],
        derivedKeys,
        derivedKeysNames: rpcState.state?.derivedKeysNames || {},
        derivedKeyRelatedAccounts,
        selectedAccount: rpcState.state?.selectedAccount,
        selectedMasterKey: rpcState.state?.selectedMasterKey,
        accounts,
        accountsVisibility: rpcState.state?.accountsVisibility || {},
        selectedAccountAddress,
        selectedAccountPublicKey,
        nextAccountId,
        tonWalletState,
        tokenWalletStates,
    })

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
                recentMasterKeys: rpcState.state?.recentMasterKeys || [],
                derivedKeys,
                derivedKeysNames: rpcState.state?.derivedKeysNames || {},
                derivedKeyRelatedAccounts,
                derivedKeyExternalAccounts,
                selectedAccount: rpcState.state?.selectedAccount,
                selectedMasterKey: rpcState.state?.selectedMasterKey,
                accounts,
                accountsVisibility: rpcState.state?.accountsVisibility || {},
                selectedAccountAddress,
                selectedAccountPublicKey,
                nextAccountId,
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
