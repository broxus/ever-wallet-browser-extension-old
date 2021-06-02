import {
    WalletContractType,
    RawPermissions,
    Permission,
    RawFunctionCall,
} from 'ton-inpage-provider'
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

export type LedgerKeyToCreate = {
    accountId: number
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
    notifyReceiver: boolean
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
    // Path to graphql api endpoint, e.g. `https://main.ton.dev`
    endpoint: string
    // Request timeout in milliseconds
    timeout: number
}

export type JrpcSocketParams = {
    // Path to jrpc api endpoint
    endpoint: string
}

export type ConnectionData = { name: string; group: string } & (
    | nt.EnumItem<'graphql', GqlSocketParams>
    | nt.EnumItem<'jrpc', JrpcSocketParams>
)

export type ConnectionDataItem = { id: number } & ConnectionData

export type ApprovalApi = {
    requestPermissions: {
        input: {
            permissions: Permission[]
        }
        output: Partial<RawPermissions>
    }
    callContractMethod: {
        input: {
            publicKey: string
            recipient: string
            payload: RawFunctionCall
        }
        output: nt.KeyPassword
    }
    sendMessage: {
        input: {
            sender: string
            recipient: string
            amount: string
            bounce: boolean
            payload?: RawFunctionCall
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
