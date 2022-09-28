import type * as nt from '@nekoton'

import { ConnectionController } from '../ConnectionController'
import { ContractSubscription, IContractHandler } from '../../utils/ContractSubscription'

export interface ITonWalletHandler extends IContractHandler<nt.Transaction> {
    onUnconfirmedTransactionsChanged(unconfirmedTransactions: nt.MultisigPendingTransaction[]): void

    onCustodiansChanged(custodians: string[]): void

    onDetailsChanged(details: nt.TonWalletDetails): void
}

export class TonWalletSubscription extends ContractSubscription<nt.TonWallet> {
    private readonly _contractType: nt.ContractType

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

            return new TonWalletSubscription(clock, connection, release, tonWallet)
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

            return new TonWalletSubscription(clock, connection, release, tonWallet)
        } catch (e: any) {
            release()
            throw e
        }
    }

    constructor(
        clock: nt.ClockWithOffset,
        connection: nt.GqlConnection | nt.JrpcConnection,
        release: () => void,
        contract: nt.TonWallet
    ) {
        super(clock, connection, release, contract.address, contract)
        this._contractType = contract.contractType
    }
}
