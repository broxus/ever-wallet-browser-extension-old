import { TsjsonParser } from 'ts-json-validator'
import { ApprovalController } from './controllers/ApprovalController'
import { PermissionsController, validatePermission } from './controllers/PermissionsController'
import { ConnectionController } from './controllers/ConnectionController'
import { NekotonRpcError, RpcErrorCode } from '../../shared/utils'
import { JsonRpcMiddleware, JsonRpcRequest } from '../../shared/jrpc'
import { PROVIDER_API, Permission } from '../../shared/models'

const invalidRequest = (req: JsonRpcRequest<unknown>, message: string, data?: unknown) =>
    new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, `${req.method}: ${message}`, data)

interface CreateProviderMiddlewareOptions {
    origin: string
    isInternal: boolean
    approvals: ApprovalController
    permissions: PermissionsController
    connection: ConnectionController
}

type ProviderMethod<T extends { input?: TsjsonParser<any>; output?: TsjsonParser<any> }> = (
    ...args: [
        ...Parameters<
            JsonRpcMiddleware<
                T['input'] extends TsjsonParser<any> ? ReturnType<T['input']['parse']> : {},
                T['output'] extends TsjsonParser<any> ? ReturnType<T['output']['parse']> : {}
            >
        >,
        CreateProviderMiddlewareOptions
    ]
) => Promise<void>

// helper methods:
//

const requirePermissions = (
    { origin, isInternal, permissions: permissionsController }: CreateProviderMiddlewareOptions,
    permissions: Permission[]
) => {
    if (!isInternal) {
        permissionsController.checkPermissions(origin, permissions)
    }
}

// provider api methods
//

const requireParams = (req: JsonRpcRequest<unknown>, { input }: { input: TsjsonParser<any> }) => {
    if (!input.validates(req.params)) {
        throw invalidRequest(req, 'Invalid params', input.getErrors())
    }
}

const requestPermissions: ProviderMethod<typeof PROVIDER_API.requestPermissions> = async (
    req,
    res,
    _next,
    end,
    { origin, isInternal, permissions: permissionsController }
) => {
    if (isInternal) {
        throw invalidRequest(req, 'cannot request permissions for internal streams')
    }

    requireParams(req, PROVIDER_API.requestPermissions)

    const { permissions } = req.params!

    permissions.map(validatePermission)

    await permissionsController.requestPermissions(origin, permissions as Permission[])

    res.result = null
    end()
}

const getProviderState: ProviderMethod<typeof PROVIDER_API.getProviderState> = async (
    _req,
    res,
    _next,
    end,
    { connection }
) => {
    const { selectedConnection } = connection.state

    res.result = {
        selectedConnection,
    }
    end()
}

const runLocal: ProviderMethod<typeof PROVIDER_API.runLocal> = async (
    req,
    res,
    _next,
    end,
    ctx
) => {
    requirePermissions(ctx, ['accountInteraction'])
    requireParams(req, PROVIDER_API.runLocal)

    // TODO

    res.result = {}
    end()
}

const sendMessage: ProviderMethod<typeof PROVIDER_API.sendMessage> = async (
    req,
    res,
    _next,
    end,
    ctx
) => {
    requirePermissions(ctx, ['accountInteraction'])
    requireParams(req, PROVIDER_API.sendMessage)

    const { origin, approvals } = ctx

    const { recipient, amount, abi, payload } = req.params!

    const _password = await approvals.addAndShowApprovalRequest({
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
    requestPermissions,
    getProviderState,
    runLocal,
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
            ;(providerRequests as { [method: string]: ProviderMethod<any> })
                [req.method](req, res, next, end, options)
                .catch(end)
        }
    }
}
