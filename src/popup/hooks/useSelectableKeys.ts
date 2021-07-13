import * as React from 'react'

import * as nt from '@nekoton'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

export type SelectableKeys = {
    deployer?: nt.KeyStoreEntry
    keys: nt.KeyStoreEntry[]
}

export function useSelectableKeys(selectedAccount?: nt.AssetsList): SelectableKeys {
    const accountability = useAccountability()
    const rpcState = useRpcState()

    const account = selectedAccount || accountability.selectedAccount

    if (account == null) {
        return { deployer: undefined, keys: [] }
    }

    const { storedKeys, accountCustodians } = rpcState.state

    const accountAddress = account.tonWallet.address
    const accountPublicKey = account.tonWallet.publicKey

    return React.useMemo(() => {
        const deployer = storedKeys[accountPublicKey] as nt.KeyStoreEntry | undefined
        const custodians = accountCustodians[accountAddress] as string[] | undefined

        return {
            deployer,
            keys:
                custodians != null
                    ? custodians.map((publicKey) => storedKeys[publicKey]).filter((c) => c)
                    : [],
        } as SelectableKeys
    }, [account, storedKeys, accountCustodians])
}
