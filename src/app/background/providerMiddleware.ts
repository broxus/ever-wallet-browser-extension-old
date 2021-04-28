import { ApprovalController } from './controllers/ApprovalController'
import { PermissionsController, validatePermission } from './controllers/PermissionsController'
import { ConnectionController } from './controllers/ConnectionController'
import { NekotonRpcError } from '../../shared/utils'
import { RpcErrorCode } from '../../shared/errors'
import { JsonRpcMiddleware, JsonRpcRequest } from '../../shared/jrpc'
import { ProviderApi, Permission } from '../../shared/models'
import * as nt from '@nekoton'

const invalidRequest = (req: JsonRpcRequest<unknown>, message: string, data?: unknown) =>
    new NekotonRpcError(RpcErrorCode.INVALID_REQUEST, `${req.method}: ${message}`, data)

interface CreateProviderMiddlewareOptions {
    origin: string
    isInternal: boolean
    approvals: ApprovalController
    permissions: PermissionsController
    connection: ConnectionController
}

type ProviderMethod<T extends keyof ProviderApi> = ProviderApi[T] extends {
    input?: infer I
    output?: infer O
}
    ? (
          ...args: [
              ...Parameters<
                  JsonRpcMiddleware<I extends undefined ? {} : I, O extends undefined ? {} : O>
              >,
              CreateProviderMiddlewareOptions
          ]
      ) => Promise<void>
    : never

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

type WithParams<P, T> = P & { params: T }

function requireParams<T>(req: JsonRpcRequest<T>): asserts req is WithParams<typeof req, T> {
    if (req.params == null || typeof req.params !== 'object') {
        throw invalidRequest(req, 'required params object')
    }
}

function requireBoolean<T, O, P extends keyof O>(req: JsonRpcRequest<T>, object: O, key: P) {
    const property = object[key]
    if (typeof property !== 'boolean') {
        throw invalidRequest(req, `'${key}' must be a boolean`)
    }
}

function requireString<T, O, P extends keyof O>(req: JsonRpcRequest<T>, object: O, key: P) {
    const property = object[key]
    if (typeof property !== 'string' || property.length === 0) {
        throw invalidRequest(req, `'${key}' must be non-empty string`)
    }
}

function requireOptionalString<T, O, P extends keyof O>(req: JsonRpcRequest<T>, object: O, key: P) {
    const property = object[key]
    if (property != null && (typeof property !== 'string' || property.length === 0)) {
        throw invalidRequest(req, `'${key}' must be a non-empty string if provided`)
    }
}

function requireNumber<T, O, P extends keyof O>(req: JsonRpcRequest<T>, object: O, key: P) {
    const property = object[key]
    if (typeof property !== 'number') {
        throw invalidRequest(req, `'${key}' must be a number`)
    }
}

function requireOptionalNumber<T, O, P extends keyof O>(req: JsonRpcRequest<T>, object: O, key: P) {
    const property = object[key]
    if (property != null && typeof property !== 'number') {
        throw invalidRequest(req, `'${key}' must be a number if provider`)
    }
}

function requireArray<T, O, P extends keyof O>(req: JsonRpcRequest<T>, object: O, key: P) {
    const property = object[key]
    if (!Array.isArray(property)) {
        throw invalidRequest(req, `'${key}' must be an array`)
    }
}

// Provider api
//

const requestPermissions: ProviderMethod<'requestPermissions'> = async (
    req,
    res,
    _next,
    end,
    { origin, isInternal, permissions: permissionsController }
) => {
    if (isInternal) {
        throw invalidRequest(req, 'cannot request permissions for internal streams')
    }

    requireParams(req)

    const { permissions } = req.params
    requireArray(req, req.params, 'permissions')

    permissions.map(validatePermission)

    await permissionsController.requestPermissions(origin, permissions as Permission[])

    res.result = {}
    end()
}

const getProviderState: ProviderMethod<'getProviderState'> = async (
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

const getFullAccountState: ProviderMethod<'getFullAccountState'> = async (
    req,
    res,
    _next,
    end,
    ctx
) => {
    requirePermissions(ctx, ['tonClient'])
    requireParams(req)

    const { address } = req.params
    requireString(req, req.params, 'address')

    const { connection } = ctx

    const state = await connection.use(
        async ({ data: { connection } }) => await connection.getFullAccountState(address)
    )

    res.result = {
        state,
    }
    end()
}

const runLocal: ProviderMethod<'runLocal'> = async (req, res, _next, end, ctx) => {
    requirePermissions(ctx, ['tonClient'])
    requireParams(req)

    const { address, abi, method, params } = req.params
    requireString(req, req.params, 'address')
    requireString(req, req.params, 'abi')
    requireString(req, req.params, 'method')

    const { connection } = ctx

    const state = await connection.use(
        async ({ data: { connection } }) => await connection.getFullAccountState(address)
    )

    if (state == null) {
        throw invalidRequest(req, 'Account not found')
    }

    try {
        const output = nt.runLocal(
            state.genTimings,
            state.lastTransactionId,
            state.boc,
            abi,
            method,
            params
        )

        res.result = {
            output,
        }
        end()
    } catch (e) {
        throw invalidRequest(req, e.toString())
    }
}

const getExpectedAddress: ProviderMethod<'getExpectedAddress'> = async (
    req,
    res,
    _next,
    end,
    ctx
) => {
    requirePermissions(ctx, ['tonClient'])
    requireParams(req)

    const { tvc, abi, workchain, publicKey, initParams } = req.params
    requireString(req, req.params, 'tvc')
    requireString(req, req.params, 'abi')
    requireOptionalNumber(req, req.params, 'workchain')
    requireOptionalString(req, req.params, 'publicKey')

    try {
        const address = nt.getExpectedAddress(tvc, abi, workchain || 0, publicKey, initParams)

        res.result = {
            address,
        }
        end()
    } catch (e) {
        throw invalidRequest(req, e.toString())
    }
}

const encodeInternalInput: ProviderMethod<'encodeInternalInput'> = async (
    req,
    res,
    _next,
    end,
    ctx
) => {
    requirePermissions(ctx, ['tonClient'])
    requireParams(req)

    const { abi, method, params } = req.params
    requireString(req, req.params, 'abi')
    requireString(req, req.params, 'method')

    try {
        const boc = nt.encodeInternalInput(abi, method, params)
        res.result = {
            boc,
        }
        end()
    } catch (e) {
        throw invalidRequest(req, e.toString())
    }
}

const decodeInput: ProviderMethod<'decodeInput'> = async (req, res, _next, end, ctx) => {
    requirePermissions(ctx, ['tonClient'])
    requireParams(req)

    const { body, abi, method, internal } = req.params
    requireString(req, req.params, 'body')
    requireString(req, req.params, 'abi')
    requireString(req, req.params, 'method')
    requireBoolean(req, req.params, 'internal')

    try {
        const output = nt.decodeInput(body, abi, method, internal)
        res.result = {
            output,
        }
        end()
    } catch (e) {
        throw invalidRequest(req, e.toString())
    }
}

const decodeOutput: ProviderMethod<'decodeOutput'> = async (req, res, _next, end, ctx) => {
    requirePermissions(ctx, ['tonClient'])
    requireParams(req)

    const { body, abi, method } = req.params
    requireString(req, req.params, 'body')
    requireString(req, req.params, 'abi')
    requireString(req, req.params, 'method')

    try {
        const output = nt.decodeOutput(body, abi, method)
        res.result = {
            output,
        }
        end()
    } catch (e) {
        throw invalidRequest(req, e.toString())
    }
}

const sendMessage: ProviderMethod<'sendMessage'> = async (req, res, _next, end, ctx) => {
    requirePermissions(ctx, ['accountInteraction'])
    requireParams(req)

    const { recipient, amount, abi, payload } = req.params
    requireString(req, req.params, 'recipient')
    requireString(req, req.params, 'amount')
    requireOptionalString(req, req.params, 'abi')
    requireOptionalString(req, req.params, 'payload')

    const { origin, approvals } = ctx

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

const providerRequests: { [K in keyof ProviderApi]: ProviderMethod<K> } = {
    requestPermissions,
    getProviderState,
    getFullAccountState,
    runLocal,
    getExpectedAddress,
    encodeInternalInput,
    decodeInput,
    decodeOutput,
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
