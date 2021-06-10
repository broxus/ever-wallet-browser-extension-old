import * as nt from '@nekoton'

import { ConnectionController } from '../ConnectionController'
import { ContractSubscription, IContractHandler } from '../../utils/ContractSubscription'

export class TonWalletSubscription extends ContractSubscription<nt.TonWallet> {
    public static async subscribe(
        connectionController: ConnectionController,
        publicKey: string,
        contractType: nt.ContractType,
        handler: IContractHandler<nt.Transaction>,
        owners: string[]
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
                handler,
                owners
            )

            return new TonWalletSubscription(connection, release, tonWallet.address, tonWallet)
        } catch (e) {
            release()
            throw e
        }
    }
}
