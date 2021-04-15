import { AppDispatch } from '../store'

import * as nt from '../../../nekoton/pkg'

export enum Step {
    WELCOME_PAGE,
    CREATE_NEW_WALLET,
    RESTORE_WALLET,
    MAIN_PAGE,
}

window.ObjectExt = { keys: Object.keys }

export const DEFAULT_CONTRACT_TYPE: nt.ContractType = 'SafeMultisigWallet'

export type Action<F extends Function> = F extends (
    ...args: infer A
) => (app: AppDispatch) => Promise<infer R>
    ? (...args: A) => Promise<R>
    : never
