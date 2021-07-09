import * as React from 'react'

import * as nt from '@nekoton'
import { Send } from '@popup/components/Send'
import { useAccountability } from '@popup/providers/AccountabilityProvider'
import { useRpc } from '@popup/providers/RpcProvider'
import { closeCurrentWindow, useRpcState } from '@popup/providers/RpcStateProvider'
import { WalletMessageToSend } from '@shared/backgroundApi'


export function SendPage(): JSX.Element | null {
	const accountability = useAccountability()
	const rpc = useRpc()
	const rpcState = useRpcState()

	if (accountability.selectedAccount == null) {
		return null
	}

	const {
		externalAccounts,
		knownTokens,
		selectedAccount,
		selectedConnection,
		storedKeys,
	} = rpcState.state

	const accountName = selectedAccount?.name as string
	const accountAddress = selectedAccount?.tonWallet.address as string
	const accountPublicKey = selectedAccount?.tonWallet.publicKey as string

	const selectedKeys = React.useMemo(() => {
		let keys: nt.KeyStoreEntry[] = [storedKeys[accountPublicKey]]
		const externals = externalAccounts.find(
			(account) => account.address === accountAddress
		)

		if (externals !== undefined) {
			keys = keys.concat(externals.externalIn.map((key) => storedKeys[key]))
		}

		return keys.filter((e) => e)
	}, [accountability.selectedAccount, externalAccounts, storedKeys])

	if (selectedKeys[0] === undefined) {
		return null
	}

	const tonWalletAsset = accountability.selectedAccount.tonWallet
	const tokenWalletAssets =
		accountability.selectedAccount.additionalAssets[selectedConnection.group]?.tokenWallets ||
		[]
	const tonWalletState = rpcState.state.accountContractStates[accountAddress] as
		| nt.ContractState
		| undefined
	const tokenWalletStates = rpcState.state.accountTokenStates[accountAddress] || {}

	const sendMessage = async (message: WalletMessageToSend) => {
		return rpc.sendMessage(accountAddress as string, message)
	}

	const onBack = () => {
		closeCurrentWindow()
	}

	return tonWalletState !== undefined ? (
		<div className="send-screen__page">
			<Send
				accountName={accountName}
				tonWalletAsset={tonWalletAsset}
				tokenWalletAssets={tokenWalletAssets}
				keyEntries={selectedKeys}
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
				onBack={onBack}
			/>
		</div>
	) : null
}
