import _ from 'lodash'
import { BaseConfig, BaseController, BaseState } from './BaseController'
import { ApprovalController } from './ApprovalController'
import { NekotonRpcError } from '../../../shared/utils'
import { RpcErrorCode } from '../../../shared/errors'
import { PERMISSIONS, Permission } from '../../../shared/models'

const PERMISSIONS_STORE_KEY = 'permissions'

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
    [PERMISSIONS_STORE_KEY]: { [origin: string]: Partial<typeof PERMISSIONS> }
}

const defaultState: PermissionsState = {
    [PERMISSIONS_STORE_KEY]: {},
}

export class PermissionsController extends BaseController<PermissionsConfig, PermissionsState> {
    constructor(config: PermissionsConfig, state?: PermissionsState) {
        super(config, state || defaultState)
        this.initialize()
    }

    public async requestPermissions(origin: string, permissions: Permission[]) {
        const uniquePermissions = _.uniq(permissions)

        const originPermissions: Partial<
            typeof PERMISSIONS
        > = await this.config.approvals.addAndShowApprovalRequest({
            origin,
            type: 'requestPermissions',
            requestData: {
                permissions: uniquePermissions,
            },
        })

        const newPermissions = {
            ...this.state[PERMISSIONS_STORE_KEY],
            [origin]: originPermissions,
        }

        this.update(
            {
                [PERMISSIONS_STORE_KEY]: newPermissions,
            },
            true
        )
    }

    public removeOrigin(origin: string) {
        const permissions = this.state[PERMISSIONS_STORE_KEY]
        const newPermissions = { ...permissions }
        delete newPermissions[origin]

        this.update(
            {
                [PERMISSIONS_STORE_KEY]: newPermissions,
            },
            true
        )
    }

    public checkPermissions(origin: string, permissions: Permission[]) {
        const originPermissions = this.state[PERMISSIONS_STORE_KEY][origin]
        if (originPermissions == null) {
            throw new NekotonRpcError(
                RpcErrorCode.INSUFFICIENT_PERMISSIONS,
                `There are no permissions for origin "${origin}"`
            )
        }

        for (const permission of permissions) {
            if ((originPermissions[permission] as any) == null) {
                throw new NekotonRpcError(
                    RpcErrorCode.INSUFFICIENT_PERMISSIONS,
                    `Requested permission "${permission}" not found for origin ${origin}`
                )
            }
        }
    }
}
