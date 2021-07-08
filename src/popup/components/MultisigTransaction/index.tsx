import * as React from 'react'

import * as nt from '@nekoton'
import {
	convertCurrency,
	extractTokenTransactionAddress,
	extractTransactionAddress, parseCurrency,
	trimTokenName,
} from '@shared/utils'

import Button from '@popup/components/Button'
import { CopyText } from '@popup/components/CopyText'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'
import Input from '@popup/components/Input'
import { useState } from 'react'
import Select from 'react-select'
import { selectStyles } from '@popup/constants/selectStyle'
import {ConfirmMessageToPrepare, TransferMessageToPrepare} from "@shared/backgroundApi";
import {prepareKey} from "@popup/utils";


type Props = {
	symbol?: nt.Symbol
	transaction: nt.TonWalletTransaction | nt.TokenWalletTransaction
	selectedKeys: nt.KeyStoreEntry[]
}

enum LocalStep {
	PREVIEW,
	ENTER_PASSWORD,
}

const TRANSACTION_NAMES = {
	to: 'Recipient',
	service: 'Recipient',
	from: 'Sender',
	incoming_transfer: 'Sender',
	outgoing_transfer: 'Recipient',
	swap_back: 'Recipient',
}

export function MultisigTransactionSign({ transaction, symbol, selectedKeys }: Props): JSX.Element {
	const rpc = useRpc()
	const rpcState = useRpcState()

	const [custodians, setCustodians] = React.useState<string[]>([])
	const [password, setPassword] = useState<string>('')
	const [step, setStep] = React.useState(LocalStep.PREVIEW)

	console.log('_TRANS', transaction, rpcState.state.accountUnconfirmedTransactions)

	const value = React.useMemo(() => {
		return transaction.info?.data.data.value
	}, [symbol, transaction])

	let direction: string | undefined,
		address: string | undefined

	if (symbol == null) {
		const txAddress = extractTransactionAddress(transaction)
		direction = TRANSACTION_NAMES[txAddress.direction]
		address = txAddress.address
	}
	else {
		const tokenTransaction = transaction as nt.TokenWalletTransaction
		const txAddress = extractTokenTransactionAddress(tokenTransaction)
		if (txAddress && tokenTransaction.info) {
			direction = (TRANSACTION_NAMES as any)[tokenTransaction.info.type]
			address = txAddress?.address
		}
	}

	const decimals = symbol == null ? 9 : symbol.decimals
	const currencyName = symbol == null ? 'TON' : symbol.name
	const transactionId = transaction.info?.data.data.transactionId as string

	const unconfirmedTransaction = React.useMemo(() => {
		return address !== undefined
			? rpcState.state.accountUnconfirmedTransactions[address][transactionId]
			: undefined
	}, [custodians, transaction])
	const confirmations: string[] = unconfirmedTransaction?.confirmations || []

	console.log(confirmations)
	console.log(selectedKeys)
	console.log(selectedKeys.filter(key => !confirmations.includes(key.publicKey)))

	const [keys, setKeys] = React.useState(selectedKeys.filter(key => !confirmations.includes(key.publicKey)))
	const [selectedKey, setKey] = React.useState<nt.KeyStoreEntry>(keys[0])

	const onConfirm = () => {
		setStep(LocalStep.ENTER_PASSWORD)
	}

	const onBack = () => {
		setStep(LocalStep.PREVIEW)
	}

	const onSubmit = async () => {
		let messageToPrepare: ConfirmMessageToPrepare;
		messageToPrepare = {
			publicKey: selectedKey.publicKey,
			transactionId: transactionId
		}
		if (transaction.inMessage.dst === undefined) return
		const internalMessage = await rpc.prepareConfirmMessage(
			transaction.inMessage.dst,
			messageToPrepare,
			prepareKey(selectedKey, password)
		)
		await rpc.sendMessage(transaction.inMessage.dst, internalMessage)
	}

	React.useEffect(() => {
		if (address !== undefined) {
			(async () => {
				try {
					await rpc.getCustodians(address as string).then((res: string[]) => {
						setCustodians(res)
					})
				}
				catch (e) {

				}
			})()
		}
	}, [])

	if (step === LocalStep.ENTER_PASSWORD) {
		return (
			<>
				<h2 className="transaction-info-title noselect">Enter password to confirm transaction</h2>
				{keys.length > 1 ? (
					<Select
						className="send-screen__form-input"
						styles={selectStyles}
						options={keys}
						value={selectedKey}
						formatOptionLabel={(value) => value.name}
						onChange={(v) => v == null ? null : setKey(v)}
					/>
				) : null}
				<Input
					label="Password..."
					type="password"
					value={password}
					onChange={setPassword}
				/>
				<Button text="Confirm" onClick={onSubmit} />
			</>
		)
	}

	return (
		<>
			<h2 className="transaction-info-title noselect">Multisignature transaction</h2>
			<div className="transaction-info-tx-details">
				<div className="transaction-info-tx-details-param">
					<span className="transaction-info-tx-details-param-desc">Date and time</span>
					<span className="transaction-info-tx-details-param-value">
                        {new Date(transaction.createdAt * 1000).toLocaleString()}
                    </span>
				</div>

				{address !== undefined && (
					<div className="transaction-info-tx-details-param">
						<span className="transaction-info-tx-details-param-desc">{direction}</span>
						<CopyText
							className="transaction-info-tx-details-param-value copy"
							id={`copy-${address}`}
							text={address}
						/>
					</div>
				)}

				{transactionId !== undefined && (
					<div className="transaction-info-tx-details-param">
						<span className="transaction-info-tx-details-param-desc">Transaction Id</span>
						<span className="transaction-info-tx-details-param-value">{transactionId}</span>
					</div>
				)}

				<div className="transaction-info-tx-details-separator" />
				<div className="transaction-info-tx-details-param">
					<span className="transaction-info-tx-details-param-desc">Amount</span>
					<span className="transaction-info-tx-details-param-value">
                        {convertCurrency(value.toString(), decimals)}{' '}
						{currencyName.length >= 10 ? trimTokenName(currencyName) : currencyName}
                    </span>
				</div>

				{custodians.length > 1 && (
					<>
						<div className="transaction-info-tx-details-separator" />
						<div className="transaction-info-tx-details-param">
							<span className="transaction-info-tx-details-param-desc">Signatures</span>
							<span className="transaction-info-tx-details-param-value">
                                {JSON.stringify(unconfirmedTransaction?.confirmations.length)} of {custodians.length} signatures collected
                            </span>
						</div>

						{custodians.map((custodian, idx) => (
							<div key={custodian} className="transaction-info-tx-details-param">
								<span className="transaction-info-tx-details-param-desc">Custodian {idx + 1}</span>
								<CopyText
									className="transaction-info-tx-details-param-value copy"
									id={`copy-${custodian}`}
									text={custodian}
								/>
							</div>
						))}
					</>
				)}
			</div>

			<Button text="Confirm" onClick={onConfirm} />
		</>
	)
}
