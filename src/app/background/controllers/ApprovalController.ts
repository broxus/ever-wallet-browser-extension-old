import _ from 'lodash'
import { nanoid } from 'nanoid'
import { ApprovalApi, Approval } from '@shared/backgroundApi'
import { NekotonRpcError } from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'

import { BaseController, BaseConfig, BaseState } from './BaseController'

type ApprovalPromiseResolve<T> = (value?: T) => void
type ApprovalPromiseReject = (error?: Error) => void

interface ApprovalCallbacks<T> {
    resolve: ApprovalPromiseResolve<T>
    reject: ApprovalPromiseReject
}

export interface ApprovalConfig extends BaseConfig {
    showApprovalRequest: () => void
    reserveControllerConnection: () => void
}

export interface ApprovalControllerState extends BaseState {
    pendingApprovals: { [approvalId: string]: Approval<string, unknown> }
    pendingApprovalCount: number
}

const defaultState: ApprovalControllerState = {
    pendingApprovals: {},
    pendingApprovalCount: 0,
}

export class ApprovalController extends BaseController<ApprovalConfig, ApprovalControllerState> {
    private _approvals: Map<string, ApprovalCallbacks<unknown>>
    private readonly _showApprovalRequest: () => void

    constructor(config: ApprovalConfig, state?: ApprovalControllerState) {
        const { showApprovalRequest } = config
        if (typeof showApprovalRequest !== 'function') {
            throw new Error('Must specify function showApprovalRequest')
        }

        super(config, state || _.cloneDeep(defaultState))

        this._approvals = new Map<string, ApprovalCallbacks<unknown>>()
        this._showApprovalRequest = showApprovalRequest
        this.initialize()
    }

    public addAndShowApprovalRequest<T extends keyof ApprovalApi>(options: {
        id?: string
        origin: string
        type: T
        requestData: ApprovalApi[T]['input']
    }): Promise<ApprovalApi[T]['output']> {
        const promise = this._add<T, ApprovalApi[T]['input'], ApprovalApi[T]['output']>(
            options.origin,
            options.type,
            options.id,
            options.requestData
        )
        this.config.reserveControllerConnection()
        this._showApprovalRequest()
        return promise
    }

    public get(id: string): Approval<string, unknown> | undefined {
        const info = this.state.pendingApprovals[id]
        return info ? { ...info } : undefined
    }

    public resolve<O>(id: string, value?: Exclude<O, Function>) {
        this._getCallbackOrThrow(id).resolve(value)
    }

    public reject(id: string, error: Error) {
        this._deleteApprovalAndGetCallback(id).reject(error)
    }

    public deleteApproval(id: string) {
        this._delete(id)
    }

    public clear() {
        const rejectionError = new NekotonRpcError(
            RpcErrorCode.RESOURCE_UNAVAILABLE,
            'The request was rejected; please try again'
        )

        const ids = Array.from(this._approvals.keys())
        for (const id of ids) {
            this.reject(id, rejectionError)
        }
        this.update(defaultState, true)
    }

    private _add<T extends string, I, O>(
        origin: string,
        type: T,
        id: string = nanoid(),
        requestData?: I
    ): Promise<O> {
        this._validateAddParams(id, origin, type, requestData)

        return new Promise<O>((resolve, reject) => {
            this._approvals.set(id, { resolve: resolve as ApprovalPromiseResolve<unknown>, reject })

            this._addToStore<T, I>(id, origin, type, requestData)
        })
    }

    private _validateAddParams<T>(id: string, origin: string, type: string, requestData?: T) {
        let errorMessage = null
        if (!id || typeof (id as any) !== 'string') {
            errorMessage = 'Must specify non-empty string id'
        } else if (this._approvals.has(id)) {
            errorMessage = `Approval with id "${id}" already exists`
        } else if (!origin || typeof (origin as any) !== 'string') {
            errorMessage = 'Must specify non-empty string origin'
        } else if (!type || typeof (type as any) !== 'string') {
            errorMessage = 'Must specify non-empty string type'
        } else if (requestData && (typeof requestData !== 'object' || Array.isArray(requestData))) {
            errorMessage = 'Request data must be a plain object if specified'
        }

        if (errorMessage) {
            throw new NekotonRpcError(RpcErrorCode.INTERNAL, errorMessage)
        }
    }

    private _addToStore<T extends string, I>(id: string, origin: string, type: T, requestData?: I) {
        const approval: Approval<T, I> = { id, origin, type, time: Date.now() }
        if (requestData) {
            approval.requestData = requestData
        }

        const approvals = {
            ...this.state.pendingApprovals,
            [id]: approval,
        }

        this.update(
            {
                pendingApprovals: approvals,
                pendingApprovalCount: Object.keys(approvals).length,
            },
            true
        )
    }

    private _delete(id: string) {
        this._approvals.delete(id)

        const approvals = this.state.pendingApprovals
        const newApprovals = { ...approvals }
        delete newApprovals[id]
        this.update(
            {
                pendingApprovals: newApprovals,
                pendingApprovalCount: Object.keys(newApprovals).length,
            },
            true
        )
    }

    private _getCallbackOrThrow<U>(id: string): ApprovalCallbacks<U> {
        const callbacks = this._approvals.get(id)
        if (!callbacks) {
            throw new Error(`Approval with id "${id}" not found`)
        }
        return callbacks
    }

    private _deleteApprovalAndGetCallback<U>(id: string): ApprovalCallbacks<U> {
        const callbacks = this._getCallbackOrThrow(id)
        this._delete(id)
        return callbacks
    }
}
