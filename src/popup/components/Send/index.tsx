import * as React from 'react'

import * as nt from '@nekoton'
import { PrepareMessage } from '@popup/components/Send/components'
import { closeCurrentWindow, useRpcState } from '@popup/providers/RpcStateProvider'
import {
    TransferMessageToPrepare,
    TokenMessageToPrepare,
    WalletMessageToSend,
} from '@shared/backgroundApi'
import { ENVIRONMENT_TYPE_NOTIFICATION } from '@shared/constants'
import { SelectedAsset, TokenWalletState } from '@shared/utils'

type Props = {
    accountName: string
    tonWalletAsset: nt.TonWalletAsset
    tokenWalletAssets: nt.TokenWalletAsset[]
    defaultAsset?: SelectedAsset
    keyEntries: nt.KeyStoreEntry[]
    tonWalletState: nt.ContractState
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
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
    onBack(): void
}

export function Send({
    accountName,
    tonWalletAsset,
    tokenWalletAssets,
    defaultAsset,
    keyEntries,
    tonWalletState,
    tokenWalletStates,
    knownTokens,
    estimateFees,
    prepareMessage,
    prepareTokenMessage,
    sendMessage,
    onBack,
}: Props): JSX.Element {
    const rpcState = useRpcState()

    const trySendMessage = async (message: WalletMessageToSend) => {
        sendMessage(message).then(() => {})
        if (rpcState.activeTab?.type === ENVIRONMENT_TYPE_NOTIFICATION) {
            closeCurrentWindow()
        }
    }

    return (
        <PrepareMessage
            accountName={accountName}
            tonWalletAsset={tonWalletAsset}
            tokenWalletAssets={tokenWalletAssets}
            defaultAsset={
                defaultAsset || {
                    type: 'ton_wallet',
                    data: {
                        address: tonWalletAsset.address,
                    },
                }
            }
            keyEntries={keyEntries}
            tonWalletState={tonWalletState}
            tokenWalletStates={tokenWalletStates}
            knownTokens={knownTokens}
            prepareMessage={prepareMessage}
            prepareTokenMessage={prepareTokenMessage}
            estimateFees={estimateFees}
            onBack={onBack}
            onSubmit={trySendMessage}
        />
    )
}
