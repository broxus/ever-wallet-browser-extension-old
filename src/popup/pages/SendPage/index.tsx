import * as React from 'react'

import * as nt from '@nekoton'
import { Send } from '@popup/components/Send'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { closeCurrentWindow, useRpcState } from '@popup/providers/RpcStateProvider'
import { WalletMessageToSend } from '@shared/backgroundApi'
import { useSelectableKeys } from '@popup/hooks/useSelectableKeys'


export function SendPage(): JSX.Element | null {
	const accountability = useAccountability()
	const rpc = useRpc()
	const rpcState = useRpcState()

	const selectedAccount = React.useMemo(() => accountability.selectedAccount, [])

	if (selectedAccount == null) {
		return null
	}

	const { knownTokens, selectedConnection } = rpcState.state
	const accountName = selectedAccount?.name as string
	const accountAddress = selectedAccount?.tonWallet.address as string
	const selectableKeys = useSelectableKeys(selectedAccount)

	// if (selectableKeys[0] == null) {
	// 	return null
	// }

	const tonWalletAsset = selectedAccount.tonWallet
	const tonWalletState = rpcState.state.accountContractStates[accountAddress] as | nt.ContractState | undefined

	if (tonWalletState == null) {
		return null
	}

	const tokenWalletAssets = selectedAccount.additionalAssets[selectedConnection.group]?.tokenWallets || []
	const tokenWalletStates = rpcState.state.accountTokenStates[accountAddress] || {}

	const sendMessage = async (message: WalletMessageToSend) => {
	    return rpc.sendMessage(accountAddress as string, message)
	}

	return (
		<div className="send-screen__page">
			<Send
				accountName={accountName}
				tonWalletAsset={tonWalletAsset}
				tokenWalletAssets={tokenWalletAssets}
				keyEntries={selectableKeys}
				tonWalletState={tonWalletState}
				tokenWalletStates={tokenWalletStates}
				knownTokens={knownTokens}
				estimateFees={async (params) =>
					await rpc.estimateFees(accountAddress, params)
				}
				prepareMessage={async (params, password) =>
					rpc.prepareTransferMessage(accountAddress, params, password)
				}
				prepareTokenMessage={async (owner, rootTokenContract, params) =>
					rpc.prepareTokenMessage(owner, rootTokenContract, params)
				}
				sendMessage={sendMessage}
				onBack={() => {
					closeCurrentWindow()
				}}
			/>
		</div>
	)
}
