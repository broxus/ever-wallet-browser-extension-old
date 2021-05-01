import { ContractType, Permissions, Permission, FunctionCall } from 'ton-inpage-provider'
import * as nt from '@nekoton'

export type AccountToCreate = {
    name: string
    contractType: ContractType
    seed: nt.GeneratedMnemonic
    password: string
}

export type MessageToPrepare = {
    amount: string
    recipient: string
    payload?: string
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
            signer: string
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
