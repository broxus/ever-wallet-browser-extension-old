import * as nt from '@nekoton'

import { ConnectionController } from '../ConnectionController'
import { ContractSubscription, IContractHandler } from '../../utils/ContractSubscription'

export interface ITonWalletHandler extends IContractHandler<nt.Transaction> {
    onUnconfirmedTransactionsChanged(unconfirmedTransactions: nt.MultisigPendingTransaction[]): void
}

export class TonWalletSubscription extends ContractSubscription<nt.TonWallet> {
    private readonly _contractType: nt.ContractType
    private readonly _handler: ITonWalletHandler

    public static async subscribe(
        connectionController: ConnectionController,
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
                handler
            )

            return new TonWalletSubscription(
                connection,
                release,
                tonWallet.address,
                tonWallet,
                handler
            )
        } catch (e) {
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
        if (this._contractType == 'WalletV3') {
            return
        }

        await this._contractMutex.use(async () => {
            const unconfirmedTransactions = this._contract.getMultisigPendingTransactions()
            this._handler.onUnconfirmedTransactionsChanged(unconfirmedTransactions)
        })
    }
}
