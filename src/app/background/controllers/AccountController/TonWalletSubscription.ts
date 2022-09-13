import * as nt from '@nekoton'

import { isSimpleWallet } from '@shared/contracts'
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

    public static async subscribeByAddress(
        clock: nt.ClockWithOffset,
        connectionController: ConnectionController,
        address: string,
        handler: ITonWalletHandler
    ) {
        const {
            connection: {
                data: { transport, connection },
            },
            release,
        } = await connectionController.acquire()

        try {
            const tonWallet = await transport.subscribeToNativeWalletByAddress(address, handler)

            return new TonWalletSubscription(
                clock,
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

    public static async subscribe(
        clock: nt.ClockWithOffset,
        connectionController: ConnectionController,
        workchain: number,
        publicKey: string,
        contractType: nt.ContractType,
        handler: ITonWalletHandler
    ) {
        const {
            connection: {
                data: { transport, connection },
            },
            release,
        } = await connectionController.acquire()

        try {
            const tonWallet = await transport.subscribeToNativeWallet(
                publicKey,
                contractType,
                workchain,
                handler
            )

            return new TonWalletSubscription(
                clock,
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
        clock: nt.ClockWithOffset,
        connection: nt.GqlConnection | nt.JrpcConnection,
        release: () => void,
        address: string,
        contract: nt.TonWallet,
        handler: ITonWalletHandler
    ) {
        super(clock, connection, release, address, contract)
        this._contractType = contract.contractType
        this._handler = handler
    }

    protected async onBeforeRefresh(): Promise<void> {
        const simpleWallet = isSimpleWallet(this._contractType)
        if (simpleWallet && this._hasCustodians) {
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

            if (simpleWallet) {
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
