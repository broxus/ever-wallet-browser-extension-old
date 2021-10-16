import * as nt from '@nekoton'

import { ConnectionController } from '../ConnectionController'
import { ContractSubscription, IContractHandler } from '../../utils/ContractSubscription'

export interface ITonWalletHandler extends IContractHandler<nt.Transaction> {
    onUnconfirmedTransactionsChanged(unconfirmedTransactions: nt.MultisigPendingTransaction[]): void
    onCustodiansChanged(custodians: string[]): void
}

export class TonWalletSubscription extends ContractSubscription<nt.TonWallet> {
    private readonly _contractType: nt.ContractType
    private readonly _handler: ITonWalletHandler
    private _lastTransactionLt?: string
    private _hasCustodians: boolean = false
    private _hasUnconfirmedTransactions: boolean = false

    public static async subscribe(
        connectionController: ConnectionController,
        workchain: number,
        publicKey: string,
        contractType: nt.ContractType,
        handler: ITonWalletHandler
    ) {
        const {
            connection: {
                data: { connection },
            },
            release,
        } = await connectionController.acquire()

        try {
            const tonWallet = await connection.subscribeToTonWallet(
                publicKey,
                contractType,
                workchain,
                handler
            )

            return new TonWalletSubscription(
                connection,
                release,
                tonWallet.address,
                tonWallet,
                handler
            )
        } catch (e: any) {
            release()
            throw e
        }
    }

    constructor(
        connection: nt.GqlConnection | nt.JrpcConnection,
        release: () => void,
        address: string,
        contract: nt.TonWallet,
        handler: ITonWalletHandler
    ) {
        super(connection, release, address, contract)
        this._contractType = contract.contractType
        this._handler = handler
    }

    protected async onBeforeRefresh(): Promise<void> {
        const isWalletV3 = this._contractType == 'WalletV3'
        if (isWalletV3 && this._hasCustodians) {
            return
        }

        await this._contractMutex.use(async () => {
            if (!this._hasCustodians) {
                const custodians = this._contract.getCustodians()
                if (custodians != undefined) {
                    this._hasCustodians = true
                    this._handler.onCustodiansChanged(custodians)
                }
            }

            if (isWalletV3) {
                return
            }

            const state: nt.ContractState = this._contract.contractState()
            if (
                state.lastTransactionId?.lt === this._lastTransactionLt &&
                !this._hasUnconfirmedTransactions
            ) {
                return
            }
            this._lastTransactionLt = state.lastTransactionId?.lt

            const unconfirmedTransactions = this._contract.getMultisigPendingTransactions()
            this._hasUnconfirmedTransactions = unconfirmedTransactions.length > 0
            this._handler.onUnconfirmedTransactionsChanged(unconfirmedTransactions)
        })
    }
}
