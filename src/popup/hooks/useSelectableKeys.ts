import * as React from 'react'

import * as nt from '@nekoton'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'


export function useSelectableKeys(selectedAccount?: nt.AssetsList) {
	const accountability = useAccountability()
	const rpcState = useRpcState()

	const account = selectedAccount || accountability.selectedAccount

	if (account == null) {
		return []
	}

	const {
		externalAccounts,
		storedKeys,
	} = rpcState.state

	const accountAddress = account.tonWallet.address
	const accountPublicKey = account.tonWallet.publicKey

	return React.useMemo(() => {
		let keys: nt.KeyStoreEntry[] = [storedKeys[accountPublicKey]]

		const externals = externalAccounts.find(
			(account) => account.address === accountAddress
		)

		if (externals !== undefined) {
			keys = keys.concat(externals.externalIn.map((key) => storedKeys[key]))
		}

		return keys.filter((key) => key)
	}, [account, externalAccounts, storedKeys])

}
