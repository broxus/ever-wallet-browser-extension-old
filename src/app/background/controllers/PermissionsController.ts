import _ from 'lodash'
import {
    RawPermissions,
    Permission,
    ProviderEvent,
    RawProviderEventData,
} from 'ton-inpage-provider'
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
        payload: { method: ProviderEvent; params: RawProviderEventData<T> }
    ) => void
}

export interface PermissionsState extends BaseState {
    permissions: { [origin: string]: Partial<RawPermissions> }
}

function makeDefaultState(): PermissionsState {
    return {
        permissions: {},
    }
}

export class PermissionsController extends BaseController<PermissionsConfig, PermissionsState> {
    constructor(config: PermissionsConfig, state?: PermissionsState) {
        super(config, state || makeDefaultState())
        this.initialize()
    }

    public async initialSync() {
        try {
            await new Promise<void>((resolve) => {
                chrome.storage.local.get(['permissions'], ({ permissions }) => {
                    if (typeof permissions === 'object') {
                        this.update({
                            permissions,
                        })

                        for (const origin of Object.keys(permissions)) {
                            this.config.notifyDomain?.(origin, {
                                method: 'permissionsChanged',
                                params: { permissions: {} },
                            })
                        }
                    }

                    resolve()
                })
            })
        } catch (e) {
            console.warn('Failed to load permissions', e)
        }
    }

    public async requestPermissions(origin: string, permissions: Permission[]) {
        const uniquePermissions = _.uniq(permissions)

        let existingPermissions = this.getPermissions(origin)

        let hasNewPermissions = false
        for (const permission of uniquePermissions) {
            validatePermission(permission)

            if (existingPermissions[permission] == null) {
                hasNewPermissions = true
            }
        }

        if (hasNewPermissions) {
            const originPermissions: Partial<RawPermissions> = await this.config.approvalController.addAndShowApprovalRequest(
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

            await this._savePermissions()

            existingPermissions = originPermissions
        }

        this.config.notifyDomain?.(origin, {
            method: 'permissionsChanged',
            params: { permissions: existingPermissions },
        })
        return existingPermissions
    }

    public getPermissions(origin: string): Partial<RawPermissions> {
        return this.state.permissions[origin] || {}
    }

    public async removeOrigin(origin: string) {
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

        await this._savePermissions()

        if (originPermissions != null) {
            this.config.notifyDomain?.(origin, {
                method: 'permissionsChanged',
                params: { permissions: {} },
            })
        }
    }

    public async clear() {
        const permissions = this.state.permissions

        this.update(
            {
                permissions: {},
            },
            true
        )

        await this._savePermissions()

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

    private async _savePermissions(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.storage.local.set({ permissions: this.state.permissions }, () => {
                resolve()
            })
        })
    }
}
