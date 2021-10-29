import * as nt from '@nekoton'
import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

export const getFirstPage = async (
    controllerRpc: IControllerRpcClient
): Promise<{ publicKey: string; index: number }[]> => {
    try {
        return await controllerRpc.getLedgerFirstPage()
    } catch (e: any) {
        throw e
    }
}

export const createLedgerAccount = async (controllerRpc: IControllerRpcClient) => {
    const accountId = 0
    const contractType = 'SafeMultisigWallet'

    let key: nt.KeyStoreEntry | undefined
    try {
        key = await controllerRpc.createLedgerKey({
            accountId,
        })

        await controllerRpc.createAccount({
            name: 'Ledger ' + accountId,
            publicKey: key.publicKey,
            contractType,
            workchain: 0,
        })
    } catch (e: any) {
        key && controllerRpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
    }
}

export const selectAnyAccount = async (controllerRpc: IControllerRpcClient) => {
    try {
        const mockAddr = '0:aafa193fdf6c11cd20a0831ae2a33f7ff4a5add95db7b7b30e7ceef6538e2621'
        await controllerRpc.selectAccount(mockAddr)
    } catch (e: any) {}
}
