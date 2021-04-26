import { createSchema as S, TsjsonParser, Validated } from 'ts-json-validator'

export const PERMISSIONS = {
    // Used to communicate with ton
    tonClient: true,
    // Used to request user actions
    accountInteraction: {
        address: 'unknown',
    },
}

export type Permission = keyof typeof PERMISSIONS
export type PermissionData<T extends Permission> = typeof PERMISSIONS[T]

export interface Approval<T> {
    id: string
    origin: string
    time: number
    type: string
    requestData?: T
}

const typePengingTransaction = new TsjsonParser(
    S({
        type: 'object',
        properties: {
            src: S({
                type: 'string',
                minLength: 1,
            }),
            bodyHash: S({
                type: 'string',
            }),
            expireAt: S({
                type: 'number',
            }),
        },
        required: ['bodyHash', 'expireAt'],
    })
)

export const APPROVAL_API = {
    requestPermissions: {
        input: new TsjsonParser(
            S({
                type: 'object',
                properties: {
                    permissions: S({
                        type: 'array',
                        items: [
                            S({
                                type: 'string',
                            }),
                        ],
                        minItems: 1,
                    }),
                },
                required: ['permissions'],
            })
        ),
        output: new TsjsonParser(
            S({
                type: 'array',
                items: S({
                    type: 'object',
                }),
                minItems: 1,
            })
        ),
    },
    callContractMethod: {
        input: new TsjsonParser(
            S({
                type: 'object',
                properties: {
                    address: S({
                        type: 'string',
                        minLength: 1,
                    }),
                },
                required: ['address'],
            })
        ),
        output: new TsjsonParser(
            S({
                type: 'null', // TODO
            })
        ),
    },
    sendMessage: {
        input: new TsjsonParser(
            S({
                type: 'object',
                properties: {
                    recipient: S({
                        type: 'string',
                    }),
                    amount: S({
                        type: 'string',
                    }),
                    abi: S({
                        type: 'string',
                    }),
                    payload: S({
                        type: 'string',
                    }),
                },
                required: ['recipient', 'amount'],
            })
        ),
        output: new TsjsonParser(
            S({
                type: 'null', // TODO: pass signer data
            })
        ),
    },
}

export type PendingApproval<T extends keyof typeof APPROVAL_API> = Approval<
    ReturnType<typeof APPROVAL_API[T]['input']['parse']>
>

export const PROVIDER_API = {
    requestPermissions: {
        input: new TsjsonParser(
            S({
                type: 'object',
                properties: {
                    permissions: S({
                        type: 'array',
                        items: S({
                            type: 'string',
                        }),
                        minItems: 1,
                    }),
                },
                required: ['permissions'],
            })
        ),
        output: new TsjsonParser(
            S({
                type: 'null', // TODO
            })
        ),
    },
    getProviderState: {
        output: new TsjsonParser(
            S({
                type: 'object',
                properties: {
                    selectedConnection: S({
                        type: 'object',
                    }),
                },
                required: ['selectedConnection'],
            })
        ),
    },
    runLocal: {
        permissions: ['tonClient'] as Permission[],
        input: new TsjsonParser(
            S({
                type: 'object',
                properties: {
                    abi: S({
                        type: 'string',
                        minLength: 1,
                    }),
                    method: S({
                        type: 'string',
                        minLength: 1,
                    }),
                },
                required: ['abi', 'method'],
            })
        ),
        output: new TsjsonParser(
            S({
                type: 'object',
            })
        ),
    },
    sendMessage: {
        permissions: ['accountInteraction'] as Permission[],
        input: new TsjsonParser(
            S({
                type: 'object',
                properties: {
                    recipient: S({
                        type: 'string',
                        minLength: 1,
                    }),
                    amount: S({
                        type: 'string',
                        minLength: 1,
                    }),
                    abi: S({
                        type: 'string',
                    }),
                    payload: S({
                        type: 'string',
                    }),
                },
                required: ['recipient', 'amount'],
            })
        ),
        output: typePengingTransaction,
    },
}

export default PROVIDER_API
