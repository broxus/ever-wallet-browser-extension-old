import _ from 'lodash'
import { BaseConfig, BaseController, BaseState } from './BaseController'
import { ApprovalController } from './ApprovalController'
import { NekotonRpcError } from '../../../shared/utils'
import { RpcErrorCode } from '../../../shared/errors'
import { PERMISSIONS, Permission, Permissions } from '../../../shared/models'

export const validatePermission = (permission: string) => {
    if (typeof (permission as any) !== 'string') {
        throw new NekotonRpcError(
            RpcErrorCode.INVALID_REQUEST,
            `Permission must be a non-empty string`
        )
    }

    if ((PERMISSIONS as any)[permission] == null) {
        throw new NekotonRpcError(
            RpcErrorCode.INVALID_REQUEST,
            `Unknown permission "${permission}"`
        )
    }
}

export interface PermissionsConfig extends BaseConfig {
    approvals: ApprovalController
}

export interface PermissionsState extends BaseState {
    permissions: { [origin: string]: Partial<Permissions> }
}

const defaultState: PermissionsState = {
    permissions: {},
}

export class PermissionsController extends BaseController<PermissionsConfig, PermissionsState> {
    constructor(config: PermissionsConfig, state?: PermissionsState) {
        super(config, state || defaultState)
        this.initialize()
    }

    public async requestPermissions(origin: string, permissions: Permission[]) {
        const uniquePermissions = _.uniq(permissions)

        const originPermissions: Partial<Permissions> = await this.config.approvals.addAndShowApprovalRequest(
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
    }

    public getPermissions(origin: string): Partial<Permissions> {
        return this.state.permissions[origin] || {}
    }

    public removeOrigin(origin: string) {
        const permissions = this.state.permissions
        const newPermissions = { ...permissions }
        delete newPermissions[origin]

        this.update(
            {
                permissions: newPermissions,
            },
            true
        )
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
