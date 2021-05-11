import { WalletContractType, Permissions, Permission, FunctionCall } from 'ton-inpage-provider'
import * as nt from '@nekoton'

export type MasterKeyToCreate = {
    seed: nt.GeneratedMnemonic
    password: string
}

export type KeyToDerive = {
    accountId: number
    password: string
}

export type KeyToRemove = {
    publicKey: string
}

export type TokenWalletsToUpdate = {
    [rootTokenContract: string]: boolean
}

export type AccountToCreate = {
    name: string
    publicKey: string
    contractType: WalletContractType
}

export type MessageToPrepare = {
    amount: string
    recipient: string
    payload?: string
}

export type TokenMessageToPrepare = {
    amount: string
    recipient: string
}

export type SwapBackMessageToPrepare = {
    amount: string
    ethAddress: string
    proxyAddress?: string
}

export interface Approval<T extends string, D> {
    id: string
    origin: string
    time: number
    type: T
    requestData?: D
}

export type GqlSocketParams = {
    // Path to graphql qpi endpoint, e.g. `https://main.ton.dev`
    endpoint: string
    // Request timeout in milliseconds
    timeout: number
}

export type ConnectionData = nt.EnumItem<'graphql', GqlSocketParams>
export type NamedConnectionData = { name: string } & ConnectionData

export type ApprovalApi = {
    requestPermissions: {
        input: {
            permissions: Permission[]
        }
        output: Partial<Permissions>
    }
    callContractMethod: {
        input: {
            publicKey: string
            recipient: string
            payload: FunctionCall
        }
        output: nt.KeyPassword
    }
    sendMessage: {
        input: {
            sender: string
            recipient: string
            amount: string
            bounce: boolean
            payload?: FunctionCall
            fees: string
        }
        output: nt.KeyPassword
    }
}

export type PendingApproval<T> = T extends keyof ApprovalApi
    ? ApprovalApi[T]['input'] extends undefined
        ? Approval<T, undefined>
        : Approval<T, {}> & { requestData: ApprovalApi[T]['input'] }
    : never

export type ApprovalOutput<T extends keyof ApprovalApi> = ApprovalApi[T]['output']
