import * as React from 'react'

import * as nt from '@nekoton'
import { PrepareMessage } from '@popup/components/Send/components'
import TransactionProgress from '@popup/components/TransactionProgress'
import { MessageToPrepare, TokenMessageToPrepare } from '@shared/backgroundApi'
import {
    SelectedAsset,
    TokenWalletState,
} from '@shared/utils'

import './style.scss'


type Props = {
    accountName: string
    tonWalletAsset: nt.TonWalletAsset
    tokenWalletAssets: nt.TokenWalletAsset[]
    defaultAsset?: SelectedAsset
    keyEntries: nt.KeyStoreEntry[]
    tonWalletState: nt.ContractState
    tokenWalletStates: { [rootTokenContract: string]: TokenWalletState }
    knownTokens: { [rootTokenContract: string]: nt.Symbol }
    estimateFees(params: MessageToPrepare): Promise<string>
    prepareMessage(
        params: MessageToPrepare,
        keyPassword: nt.KeyPassword
    ): Promise<nt.SignedMessage>
    prepareTokenMessage(
        owner: string,
        rootTokenContract: string,
        params: TokenMessageToPrepare
    ): Promise<nt.InternalMessage>
    sendMessage(params: nt.SignedMessage): Promise<nt.Transaction>
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
    const [pendingResponse, setPendingResponse] = React.useState<Promise<nt.Transaction>>()

    const trySendMessage = (message: nt.SignedMessage) => {
        if (pendingResponse == null) {
            setPendingResponse(sendMessage(message))
        } else {
            throw new Error('Pending response is already set')
        }
    }

    if (pendingResponse == null) {
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
                onSubmit={(message) => trySendMessage(message)}
            />
        )
    }

    return <TransactionProgress pendingResponse={pendingResponse} onBack={onBack} />
}
