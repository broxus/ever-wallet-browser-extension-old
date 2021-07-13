import * as React from 'react'

import * as nt from '@nekoton'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import {
    TokenMessageToPrepare,
    TransferMessageToPrepare,
    WalletMessageToSend,
} from '@shared/backgroundApi'
import { SelectedAsset, TokenWalletState } from '@shared/utils'
import { useSelectableKeys, SelectableKeys } from '@popup/hooks/useSelectableKeys'
import { useRpc } from '@popup/providers/RpcProvider'

export interface TransactionContext {
    accountName: string | undefined
    accountAddress: string | undefined
    accountPublicKey: string | undefined
    defaultAsset?: SelectedAsset
    selectableKeys: SelectableKeys
    tokenWalletAssets: nt.TokenWalletAsset[]
    tokenWalletStates: { [p: string]: TokenWalletState }
    tonWalletAsset: nt.TonWalletAsset
    tonWalletState: nt.ContractState | undefined
    estimateFees(params: TransferMessageToPrepare): Promise<string>
    prepareMessage(
        params: TransferMessageToPrepare,
        keyPassword: nt.KeyPassword
    ): Promise<nt.SignedMessage>
    prepareTokenMessage(
        owner: string,
        rootTokenContract: string,
        params: TokenMessageToPrepare
    ): Promise<nt.InternalMessage>
    sendMessage(params: WalletMessageToSend): Promise<nt.Transaction>
}

type Props = {
    children: React.ReactNode
    defaultAsset?: TransactionContext['defaultAsset']
}

const Context = React.createContext<TransactionContext>({
    accountAddress: undefined,
    accountName: undefined,
    accountPublicKey: undefined,
    selectableKeys: { deployer: undefined, keys: [] },
    tokenWalletAssets: [],
    tokenWalletStates: {},
    tonWalletAsset: (undefined as unknown) as nt.TonWalletAsset,
    tonWalletState: undefined,
    estimateFees() {
        return Promise.reject()
    },
    prepareMessage() {
        return Promise.reject()
    },
    prepareTokenMessage() {
        return Promise.reject()
    },
    sendMessage() {
        return Promise.reject()
    },
})

export function useTransaction() {
    return React.useContext(Context)
}

export function TransactionProvider({ children, defaultAsset }: Props): JSX.Element | null {
    const accountability = useAccountability()
    const rpc = useRpc()
    const rpcState = useRpcState()
    const selectableKeys = useSelectableKeys()

    const selectedAccount = React.useMemo(() => accountability.selectedAccount, [])

    if (selectedAccount == null) {
        return null
    }

    const { selectedConnection } = rpcState.state

    const accountAddress = selectedAccount.tonWallet.address
    const accountName = selectedAccount.name
    const accountPublicKey = selectedAccount.tonWallet.publicKey
    const tokenWalletAssets =
        selectedAccount.additionalAssets[selectedConnection.group]?.tokenWallets || []
    const tokenWalletStates = rpcState.state.accountTokenStates[accountAddress] || {}
    const tonWalletAsset = selectedAccount.tonWallet
    const tonWalletState = rpcState.state.accountContractStates[accountAddress] as
        | nt.ContractState
        | undefined

    const estimateFees: TransactionContext['estimateFees'] = (params) => {
        return rpc.estimateFees(accountAddress as string, params)
    }

    const prepareMessage: TransactionContext['prepareMessage'] = (params, password) => {
        return rpc.prepareTransferMessage(accountAddress as string, params, password)
    }

    const prepareTokenMessage: TransactionContext['prepareTokenMessage'] = (
        owner,
        rootTokenContract,
        params
    ) => {
        return rpc.prepareTokenMessage(owner, rootTokenContract, params)
    }

    const sendMessage = async (message: WalletMessageToSend) => {
        return rpc.sendMessage(accountAddress as string, message)
    }

    return (
        <Context.Provider
            value={{
                accountAddress,
                accountName,
                accountPublicKey,
                defaultAsset: defaultAsset || {
                    type: 'ton_wallet',
                    data: {
                        address: tonWalletAsset.address,
                    },
                },
                selectableKeys,
                tokenWalletAssets,
                tokenWalletStates,
                tonWalletState,
                tonWalletAsset,
                estimateFees,
                prepareMessage,
                prepareTokenMessage,
                sendMessage,
            }}
        >
            {children}
        </Context.Provider>
    )
}
