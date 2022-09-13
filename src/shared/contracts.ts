import type * as nt from '@nekoton'
import type en from '@popup/lang/en'

export type ContractEntry = { type: nt.ContractType; description: keyof typeof en }

export const isSimpleWallet = (contract?: nt.ContractType) =>
    contract === 'WalletV3' || contract === 'EverWallet' || contract === 'HighloadWalletV2'

export const isWithoutDeploy = isSimpleWallet

export const CONTRACT_TYPE_NAMES: { [K in nt.ContractType]: string } = {
    EverWallet: 'EVER wallet',
    Multisig2: 'Multisig',
    WalletV3: 'WalletV3',
    SurfWallet: 'Surf wallet',
    SafeMultisigWallet: 'SafeMultisig',
    SafeMultisigWallet24h: 'SafeMultisig24h',
    SetcodeMultisigWallet: 'SetcodeMultisig',
    BridgeMultisigWallet: 'BridgeMultisig',
    HighloadWalletV2: 'HighloadWalletV2',
}

export const ACCOUNTS_TO_SEARCH: nt.ContractType[] = [
    'WalletV3',
    'SurfWallet',
    'SafeMultisigWallet',
    'SafeMultisigWallet24h',
    'SetcodeMultisigWallet',
    'BridgeMultisigWallet',
    'EverWallet',
    'Multisig2',
]

export const DEFAULT_WALLET_TYPE: nt.ContractType = 'EverWallet'

export const DEFAULT_WALLET_CONTRACTS: ContractEntry[] = [
    {
        type: 'EverWallet',
        description: 'CONTRACT_DESCRIPTION_EVER_WALLET',
    },
    {
        type: 'Multisig2',
        description: 'CONTRACT_DESCRIPTION_MULTISIG2',
    },
]

export const OTHER_WALLET_CONTRACTS: ContractEntry[] = [
    {
        type: 'SurfWallet',
        description: 'CONTRACT_DESCRIPTION_SURF_WALLET',
    },
    {
        type: 'WalletV3',
        description: 'CONTRACT_DESCRIPTION_WALLET_V3',
    },
    {
        type: 'SafeMultisigWallet',
        description: 'CONTRACT_DESCRIPTION_SAFE_MULTISIG',
    },
    {
        type: 'SafeMultisigWallet24h',
        description: 'CONTRACT_DESCRIPTION_SAFE_MULTISIG_24H',
    },
    {
        type: 'SetcodeMultisigWallet',
        description: 'CONTRACT_DESCRIPTION_SETCODE_MULTISIG',
    },
    {
        type: 'BridgeMultisigWallet',
        description: 'CONTRACT_DESCRIPTION_BRIDGE_MULTISIG',
    },
    {
        type: 'HighloadWalletV2',
        description: 'CONTRACT_DESCRIPTION_HIGHLOAD_WALLET_V2',
    },
]
