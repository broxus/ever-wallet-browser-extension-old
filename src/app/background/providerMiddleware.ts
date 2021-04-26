import { ApprovalController } from './controllers/ApprovalController'
import {
    PermissionsController,
    Permission,
    validatePermission,
} from './controllers/PermissionsController'
import { ConnectionController, ConnectionData } from './controllers/ConnectionController'
import { NekotonRpcError, RpcErrorCode } from '../../shared/utils'
import { JsonRpcMiddleware, JsonRpcRequest } from '../../shared/jrpc'
import * as nt from '@nekoton'

const invalidParameter = (req: JsonRpcRequest<unknown>, message: string) =>
    new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, `${req.method}: ${message}`)

interface CreateProviderMiddlewareOptions {
    origin: string
    isInternal: boolean
    approvals: ApprovalController
    permissions: PermissionsController
    connection: ConnectionController
}

type ProviderMethod<T = unknown, U = unknown> = (
    ...args: [...Parameters<JsonRpcMiddleware<T, U>>, CreateProviderMiddlewareOptions]
) => Promise<void>

// helper method
const requirePermissions = (
    { origin, isInternal, permissions: permissionsController }: CreateProviderMiddlewareOptions,
    permissions: Permission[]
) => {
    if (!isInternal) {
        permissionsController.checkPermissions(origin, permissions)
    }
}

const rejectionError = new NekotonRpcError(
    RpcErrorCode.RESOURCE_UNAVAILABLE,
    'User rejected this approval'
)

interface RequestPermissionsParams {
    permissions: Permission[]
}

const requestPermissions: ProviderMethod<RequestPermissionsParams, {}> = async (
    req,
    res,
    _next,
    end,
    { origin, isInternal, permissions: permissionsController }
) => {
    if (isInternal) {
        throw invalidParameter(req, 'cannot request permissions for internal streams')
    }

    if (!req.params || typeof req.params !== 'object') {
        throw invalidParameter(req, 'must contain params object')
    }

    const { permissions } = req.params
    if (!Array.isArray(permissions) || permissions.length === 0) {
        throw invalidParameter(req, `'permissions' must be a non-empty array`)
    }
    permissions.map(validatePermission)

    await permissionsController.requestPermissions(origin, permissions)

    res.result = true
    end()
}

interface ProviderState {
    selectedConnection: ConnectionData
}

const getProviderState: ProviderMethod<{}, ProviderState> = async (
    _req,
    res,
    _next,
    end,
    { connection }
) => {
    const { selectedConnection } = connection.state

    res.result = <ProviderState>{
        selectedConnection,
    }
    end()
}

interface SendMessageParams {
    recipient: string
    amount: string
    abi?: string
    payload?: string
}

const sendMessage: ProviderMethod<SendMessageParams, nt.PendingTransaction> = async (
    req,
    res,
    _next,
    end,
    ctx
) => {
    requirePermissions(ctx, ['accountInteraction'])

    const { origin, approvals } = ctx

    if (!req.params || typeof req.params !== 'object') {
        throw invalidParameter(req, 'must contain params object')
    }

    const { recipient, amount, abi, payload } = req.params

    if (!recipient || typeof recipient !== 'string') {
        throw invalidParameter(req, `'recipient must be a non-empty string'`)
    }
    if (!amount || typeof amount !== 'string') {
        throw invalidParameter(req, `'amount' must be a non-empty numeric string`)
    }
    if (abi && (typeof abi !== 'string' || abi.length === 0)) {
        throw invalidParameter(req, `'abi' must be a non-empty string if specified`)
    }
    if (payload && (typeof payload !== 'string' || payload.length === 0)) {
        throw invalidParameter(req, `'payload' must be a non-empty string if specified`)
    }

    try {
        await approvals.addAndShowApprovalRequest({
            origin,
            type: 'sendMessage',
            requestData: {
                recipient,
                amount,
                abi,
                payload,
            },
        })
    } catch (_) {
        throw rejectionError
    }

    res.result = {
        bodyHash: 'asd',
        expireAt: 123,
    }

    end()
}

const providerRequests = {
    requestPermissions,
    getProviderState,
    sendMessage,
}

export const createProviderMiddleware = (
    options: CreateProviderMiddlewareOptions
): JsonRpcMiddleware<unknown, unknown> => {
    return (req, res, next, end) => {
        if (!(providerRequests as any)[req.method]) {
            end(
                new NekotonRpcError(
                    RpcErrorCode.METHOD_NOT_FOUND,
                    `provider method '${req.method}' not found`
                )
            )
        } else {
            ;(providerRequests as { [method: string]: ProviderMethod })
                [req.method](req, res, next, end, options)
                .catch(end)
        }
    }
}
