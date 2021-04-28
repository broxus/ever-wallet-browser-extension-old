import { nanoid } from 'nanoid'
import { BaseController, BaseConfig, BaseState } from './BaseController'
import { NekotonRpcError } from '../../../shared/utils'
import { RpcErrorCode } from '../../../shared/errors'

const APPROVALS_STORE_KEY = 'pendingApprovals'
const APPROVAL_COUNT_STORE_KEY = 'pendingApprovalCount'

type ApprovalPromiseResolve<T> = (value?: T) => void
type ApprovalPromiseReject = (error?: Error) => void

type RequestData<T> = Record<string, T>

interface ApprovalCallbacks<T> {
    resolve: ApprovalPromiseResolve<T>
    reject: ApprovalPromiseReject
}

export interface Approval<T> {
    id: string
    origin: string
    time: number
    type: string
    requestData?: RequestData<T>
}

export interface ApprovalConfig extends BaseConfig {
    showApprovalRequest: () => void
}

export interface ApprovalState extends BaseState {
    [APPROVALS_STORE_KEY]: { [approvalId: string]: Approval<unknown> }
    [APPROVAL_COUNT_STORE_KEY]: number
}

const defaultState: ApprovalState = {
    [APPROVALS_STORE_KEY]: {},
    [APPROVAL_COUNT_STORE_KEY]: 0,
}

export class ApprovalController extends BaseController<ApprovalConfig, ApprovalState> {
    private _approvals: Map<string, ApprovalCallbacks<unknown>>
    private _origins: Map<string, Set<string>>
    private readonly _showApprovalRequest: () => void

    constructor(config: ApprovalConfig, state?: ApprovalState) {
        const { showApprovalRequest } = config
        if (typeof showApprovalRequest !== 'function') {
            throw new Error('Must specify function showApprovalRequest')
        }

        super(config, state || defaultState)

        this._approvals = new Map<string, ApprovalCallbacks<unknown>>()
        this._origins = new Map<string, Set<string>>()
        this._showApprovalRequest = showApprovalRequest
        this.initialize()
    }

    public addAndShowApprovalRequest<T, U>(options: {
        id?: string
        origin: string
        type: string
        requestData?: RequestData<T>
    }): Promise<U> {
        const promise = this._add<T, U>(
            options.origin,
            options.type,
            options.id,
            options.requestData
        )
        this._showApprovalRequest()
        return promise
    }

    public add<T, U>(options: {
        id?: string
        origin: string
        type: string
        requestData?: RequestData<T>
    }): Promise<U> {
        return this._add<T, U>(options.origin, options.type, options.id, options.requestData)
    }

    public get(id: string): Approval<unknown> | undefined {
        const info = this.state[APPROVALS_STORE_KEY][id]
        return info ? { ...info } : undefined
    }

    public getApprovalCount(options: { origin?: string; type?: string } = {}): number {
        if (!options.origin && !options.type) {
            return this.state[APPROVAL_COUNT_STORE_KEY]
        }
        const { origin, type } = options

        if (origin && type) {
            return Number(Boolean(this._origins.get(origin)?.has(type)))
        }

        if (origin) {
            return this._origins.get(origin)?.size || 0
        }

        let count = 0
        for (const approval of Object.values(this.state[APPROVALS_STORE_KEY])) {
            if (approval.type === type) {
                count += 1
            }
        }
        return count
    }

    public has(options: { id?: string; origin?: string; type?: string } = {}) {
        const { id, origin, type } = options

        if (id) {
            if (typeof (id as any) !== 'string') {
                throw new Error('Must not specify non-string id')
            }
            return this._approvals.has(id)
        }

        if (origin && typeof (origin as any) !== 'string') {
            throw new Error('Must not specify non-string origin')
        }
        if (type && typeof (type as any) !== 'string') {
            throw new Error('Must not specify non-string type')
        }

        if (origin) {
            if (type) {
                return Boolean(this._origins.get(origin)?.has(type))
            }
            return this._origins.has(origin)
        }

        if (type) {
            for (const approval of Object.values(this.state[APPROVALS_STORE_KEY])) {
                if (approval.type === type) {
                    return true
                }
            }
            return false
        }

        throw new Error('Must specify non-empty string id, origin, or type')
    }

    public resolve<U>(id: string, value?: U) {
        this._deleteApprovalAndGetCallback(id).resolve(value)
    }

    public reject(id: string, error: Error) {
        this._deleteApprovalAndGetCallback(id).reject(error)
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
        this._origins.clear()
        this.update(defaultState, true)
    }

    private _add<T, U>(
        origin: string,
        type: string,
        id: string = nanoid(),
        requestData?: RequestData<T>
    ): Promise<U> {
        this._validateAddParams(id, origin, type, requestData)

        if (this._origins.get(origin)?.has(type)) {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                `Request of type '${type}' already pending for origin ${origin}. Please wait.`
            )
        }

        return new Promise<U>((resolve, reject) => {
            this._approvals.set(id, { resolve: resolve as ApprovalPromiseResolve<unknown>, reject })
            this._addPendingApprovalOrigin(origin, type)
            this._addToStore(id, origin, type, requestData)
        })
    }

    private _validateAddParams<T>(
        id: string,
        origin: string,
        type: string,
        requestData?: RequestData<T>
    ) {
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

    private _addPendingApprovalOrigin(origin: string, type: string) {
        const originSet = this._origins.get(origin) || new Set()
        originSet.add(type)

        if (!this._origins.has(origin)) {
            this._origins.set(origin, originSet)
        }
    }

    private _addToStore<T>(id: string, origin: string, type: string, requestData?: RequestData<T>) {
        const approval: Approval<T> = { id, origin, type, time: Date.now() }
        if (requestData) {
            approval.requestData = requestData
        }

        const approvals = {
            ...this.state[APPROVALS_STORE_KEY],
            [id]: approval,
        }

        this.update(
            {
                [APPROVALS_STORE_KEY]: approvals,
                [APPROVAL_COUNT_STORE_KEY]: Object.keys(approvals).length,
            },
            true
        )
    }

    private _delete(id: string) {
        this._approvals.delete(id)

        const approvals = this.state[APPROVALS_STORE_KEY]
        const { origin, type } = approvals[id]

        ;(this._origins.get(origin) as Set<string>).delete(type)
        if (this._isEmptyOrigin(origin)) {
            this._origins.delete(origin)
        }

        const newApprovals = { ...approvals }
        delete newApprovals[id]
        this.update(
            {
                [APPROVALS_STORE_KEY]: newApprovals,
                [APPROVAL_COUNT_STORE_KEY]: Object.keys(newApprovals).length,
            },
            true
        )
    }

    private _deleteApprovalAndGetCallback<U>(id: string): ApprovalCallbacks<U> {
        const callbacks = this._approvals.get(id)
        if (!callbacks) {
            throw new Error(`Approval with id "${id}" not found`)
        }

        this._delete(id)
        return callbacks
    }

    private _isEmptyOrigin(origin: string): boolean {
        return !this._origins.get(origin)?.size
    }
}
