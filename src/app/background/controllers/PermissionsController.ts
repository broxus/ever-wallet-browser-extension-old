import _ from 'lodash'
import { Permissions, Permission, ProviderEvent, ProviderEventData } from 'ton-inpage-provider'
import { NekotonRpcError } from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'

import { BaseConfig, BaseController, BaseState } from './BaseController'
import { ApprovalController } from './ApprovalController'

const POSSIBLE_PERMISSIONS: { [K in Permission]: true } = {
    tonClient: true,
    accountInteraction: true,
}

export function validatePermission(permission: string): asserts permission is Permission {
    if (typeof (permission as any) !== 'string') {
        throw new NekotonRpcError(
            RpcErrorCode.INVALID_REQUEST,
            `Permission must be a non-empty string`
        )
    }

    if ((POSSIBLE_PERMISSIONS as any)[permission] !== true) {
        throw new NekotonRpcError(
            RpcErrorCode.INVALID_REQUEST,
            `Unknown permission "${permission}"`
        )
    }
}

export interface PermissionsConfig extends BaseConfig {
    approvalController: ApprovalController
    notifyDomain?: <T extends ProviderEvent>(
        origin: string,
        payload: { method: ProviderEvent; params: ProviderEventData<T> }
    ) => void
}

export interface PermissionsState extends BaseState {
    permissions: { [origin: string]: Partial<Permissions> }
}

const defaultState: PermissionsState = {
    permissions: {},
}

export class PermissionsController extends BaseController<PermissionsConfig, PermissionsState> {
    constructor(config: PermissionsConfig, state?: PermissionsState) {
        super(config, state || _.cloneDeep(defaultState))
        this.initialize()
    }

    public async requestPermissions(origin: string, permissions: Permission[]) {
        const uniquePermissions = _.uniq(permissions)

        const originPermissions: Partial<Permissions> = await this.config.approvalController.addAndShowApprovalRequest(
            {
                origin,
                type: 'requestPermissions',
                requestData: {
                    permissions: uniquePermissions,
                },
            }
        )

        const newPermissions = {
            ...this.state.permissions,
            [origin]: originPermissions,
        }

        this.update(
            {
                permissions: newPermissions,
            },
            true
        )

        this.config.notifyDomain?.(origin, {
            method: 'permissionsChanged',
            params: { permissions },
        })
        return originPermissions
    }

    public getPermissions(origin: string): Partial<Permissions> {
        return this.state.permissions[origin] || {}
    }

    public removeOrigin(origin: string) {
        const permissions = this.state.permissions
        const originPermissions = permissions[origin]

        const newPermissions = { ...permissions }
        delete newPermissions[origin]

        this.update(
            {
                permissions: newPermissions,
            },
            true
        )

        if (originPermissions != null) {
            this.config.notifyDomain?.(origin, {
                method: 'permissionsChanged',
                params: { permissions: {} },
            })
        }
    }

    public clear() {
        const permissions = this.state.permissions

        this.update(
            {
                permissions: {},
            },
            true
        )

        for (const origin of Object.keys(permissions)) {
            this.config.notifyDomain?.(origin, {
                method: 'permissionsChanged',
                params: { permissions: {} },
            })
        }
    }

    public checkPermissions(origin: string, permissions: Permission[]) {
        const originPermissions = this.state.permissions[origin]
        if (originPermissions == null) {
            throw new NekotonRpcError(
                RpcErrorCode.INSUFFICIENT_PERMISSIONS,
                `There are no permissions for origin "${origin}"`
            )
        }

        for (const permission of permissions) {
            if ((originPermissions as any)[permission] == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.INSUFFICIENT_PERMISSIONS,
                    `Requested permission "${permission}" not found for origin ${origin}`
                )
            }
        }
    }
}
