import { BaseConfig, BaseController, BaseState } from './BaseController'
import { ApprovalController } from './ApprovalController'
import { NekotonRpcError, RpcErrorCode } from '../../../shared/utils'

const PERMISSIONS_STORE_KEY = 'permissions'

const KNOWN_PERMISSIONS = {
    // Used to communicate with ton
    tonClient: true,
    // Used to request user actions
    accountInteraction: true,
}

export type Permission = keyof typeof KNOWN_PERMISSIONS

export const validatePermission = (permission: string) => {
    if (typeof (permission as any) !== 'string') {
        throw new NekotonRpcError(
            RpcErrorCode.INVALID_REQUEST,
            `Permission must be a non-empty string`
        )
    }

    if ((KNOWN_PERMISSIONS as any)[permission] !== true) {
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
    [PERMISSIONS_STORE_KEY]: { [origin: string]: { [K in Permission]: boolean } }
}

const defaultState: PermissionsState = {
    [PERMISSIONS_STORE_KEY]: {},
}

export class PermissionsController extends BaseController<PermissionsConfig, PermissionsState> {
    constructor(config: PermissionsConfig, state?: PermissionsState) {
        super(config, state)
        this.initialize()
    }

    public async requestPermissions(origin: string, permissions: Permission[]) {
        const originPermissions = permissions.reduce((map, item) => {
            map[item] = true
            return map
        }, {} as { [K in Permission]: boolean })

        await this.config.approvals.addAndShowApprovalRequest({
            origin,
            type: 'requestPermissions',
            requestData: {
                permissions: Object.keys(originPermissions),
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
        const originPermissions = this.state[PERMISSIONS_STORE_KEY]
        if (originPermissions == null) {
            throw new NekotonRpcError(
                RpcErrorCode.INSUFFICIENT_PERMISSIONS,
                `There are no permissions for origin "${origin}"`
            )
        }

        for (const permission of permissions) {
            if ((originPermissions[permission] as any) !== true) {
                throw new NekotonRpcError(
                    RpcErrorCode.INSUFFICIENT_PERMISSIONS,
                    `Requested permission "${permission}" not found for origin ${origin}`
                )
            }
        }
    }
}
