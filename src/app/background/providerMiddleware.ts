import { JsonRpcMiddleware, JsonRpcRequest } from '../../shared/jrpc'
import { ApprovalController } from './controllers/ApprovalController'
import * as nt from '@nekoton'
import { NekotonRpcError, RpcErrorCode } from '../../shared/utils'

const invalidParameter = (req: JsonRpcRequest<unknown>, message: string) =>
    new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, `${req.method}: ${message}`)

interface CreateProviderMiddlewareOptions {
    origin: string
    approvals: ApprovalController
}

type ProviderMethod<T = unknown, U = unknown> = (
    ...args: [...Parameters<JsonRpcMiddleware<T, U>>, CreateProviderMiddlewareOptions]
) => Promise<void>

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
    { origin, approvals }
) => {
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

    res.result = {
        bodyHash: 'asd',
        expireAt: 123,
    }

    end()
}

const providerRequests = {
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
