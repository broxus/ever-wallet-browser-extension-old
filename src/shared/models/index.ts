import { UniqueArray } from '../utils'
import { GqlSocketParams } from '../index'
import * as nt from '@nekoton'

export type AccountToCreate = {
    name: string
    contractType: nt.ContractType
    seed: nt.GeneratedMnemonic
    password: string
}

export type AccountInteractionItem = {
    address: string
    publicKey: string
    contractType: nt.ContractType
}

export const PERMISSIONS = {
    // Used to communicate with ton
    tonClient: true,
    // Used to request user actions
    accountInteraction: [] as AccountInteractionItem[],
}

export type Permissions = typeof PERMISSIONS
export type Permission = keyof Permissions
export type PermissionData<T extends Permission> = typeof PERMISSIONS[T]

export interface Approval<T extends string, D> {
    id: string
    origin: string
    time: number
    type: T
    requestData?: D
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
            address: string
        }
        output: null
    }
    sendMessage: {
        input: {
            sender: string
            recipient: string
            amount: string
            bounce: boolean
            payload?: nt.TokensObject
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

export type InternalMessageParams = {
    abi: string
    method: string
    params: nt.TokensObject
}

export type ProviderApi = {
    requestPermissions: {
        input: {
            permissions: UniqueArray<Permission>[]
        }
        output: {}
    }
    getProviderState: {
        output: {
            selectedConnection: string
            permissions: Partial<Permissions>
        }
    }
    getFullAccountState: {
        input: {
            address: string
        }
        output: {
            state?: nt.FullAccountState
        }
    }
    runLocal: {
        input: {
            address: string
            abi: string
            method: string
            params: nt.TokensObject
        }
        output: {
            output: nt.TokensObject
        }
    }
    getExpectedAddress: {
        input: {
            tvc: string
            abi: string
            workchain?: number
            publicKey?: string
            initParams: nt.TokensObject
        }
        output: {
            address: string
        }
    }
    encodeInternalInput: {
        input: {
            abi: string
            method: string
            params: nt.TokensObject
        }
        output: {
            boc: string
        }
    }
    decodeInput: {
        input: {
            body: string
            abi: string
            method: string
            internal: boolean
        }
        output: {
            output: nt.TokensObject
        }
    }
    decodeOutput: {
        input: {
            body: string
            abi: string
            method: string
        }
        output: {
            output: nt.TokensObject
        }
    }
    estimateFees: {
        input: {
            recipient: string
            amount: string
            payload?: InternalMessageParams
        }
        output: {
            fees: string
        }
    }
    sendMessage: {
        input: {
            recipient: string
            amount: string
            bounce: boolean
            payload?: InternalMessageParams
        }
        output: {
            transaction: nt.Transaction
            output?: nt.TokensObject
        }
    }
}
