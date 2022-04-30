import LedgerBridge from '@background/ledger/LedgerBridge'
import * as nt from '@nekoton'

export class LedgerConnection {
    constructor(private readonly bridge: LedgerBridge) {}

    async getPublicKey(account: number, handler: nt.LedgerQueryResultHandler) {
        await this.bridge
            .getPublicKey(account)
            .then((publicKey) => {
                handler.onResult(publicKey)
            })
            .catch((err) => {
                handler.onError(err.message)
            })
    }

    async sign(
        account: number,
        message: Buffer,
        context: nt.LedgerSignatureContext,
        handler: nt.LedgerQueryResultHandler
    ) {
        await this.bridge
            .signHash(account, new Uint8Array(message), context)
            .then((signature) => {
                handler.onResult(signature)
            })
            .catch((err) => {
                handler.onError(err.message)
            })
    }
}
