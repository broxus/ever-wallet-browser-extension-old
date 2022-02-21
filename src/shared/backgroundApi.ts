import {
    WalletContractType,
    RawPermissions,
    Permission,
    RawFunctionCall,
} from 'everscale-inpage-provider'
import * as nt from '@nekoton'

export type WindowInfo = {
    group?: string
}

export type ExternalWindowParams = {
    group: string
    width?: number
    height?: number
}

export type MasterKeyToCreate = {
    seed: nt.GeneratedMnemonic
    password: string
    name?: string
    select: boolean
}

export type KeyToDerive = {
    masterKey: string
    accountId: number
    password: string
    name?: string
}

export type KeyToRemove = {
    publicKey: string
}

export type LedgerKeyToCreate = {
    name?: string;
    accountId: number
}

export type TokenWalletsToUpdate = {
    [rootTokenContract: string]: boolean
}

export type AccountToCreate = {
    name: string
    publicKey: string
    contractType: WalletContractType
    workchain: number
}

export type DeployMessageToPrepare =
    | { type: 'single_owner' }
    | { type: 'multiple_owners'; custodians: string[]; reqConfirms: number }

export type TransferMessageToPrepare = {
    publicKey: string
    amount: string
    recipient: string
    payload?: string
}

export type ConfirmMessageToPrepare = {
    publicKey: string
    transactionId: string
}

export type TokenMessageToPrepare = {
    amount: string
    recipient: string
    payload?: string
    notifyReceiver: boolean
}

export type SwapBackMessageToPrepare = {
    amount: string
    ethAddress: string
    proxyAddress?: string
}

export type WalletMessageToSend = {
    signedMessage: nt.SignedMessage
    info: BriefMessageInfo
}

export type BriefMessageInfo =
    | nt.EnumItem<'deploy', void>
    | nt.EnumItem<'confirm', void>
    | nt.EnumItem<
          'transfer',
          {
              amount: string
              recipient: string
          }
      >

export type StoredBriefMessageInfo = BriefMessageInfo & { createdAt: number; messageHash: string }

export interface Approval<T extends string, D> {
    id: string
    origin: string
    time: number
    type: T
    requestData?: D
}

export type GqlSocketParams = {
    // Path to graphql api endpoints, e.g. `https://main.ton.dev`
    endpoints: string[]
    // Frequency of sync latency detection
    latencyDetectionInterval: number
    // Maximum value for the endpoint's blockchain data sync latency
    maxLatency: number
    // Gql node type
    local: boolean
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
    changeAccount: {
        input: {}
        output: RawPermissions['accountInteraction']
    }
    addTip3Token: {
        input: {
            account: string
            details: nt.RootTokenContractDetailsWithAddress
        }
        output: {}
    }
    signData: {
        input: {
            publicKey: string
            data: string
        }
        output: nt.KeyPassword
    }
    encryptData: {
        input: {
            publicKey: string
            data: string
        }
        output: nt.KeyPassword
    }
    decryptData: {
        input: {
            publicKey: string
            sourcePublicKey: string
        }
        output: nt.KeyPassword
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
            knownPayload: nt.KnownPayload | undefined
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
