import _ from 'lodash'
import {
    RawPermissions,
    Permission,
    ProviderEvent,
    RawProviderEventData,
} from 'ton-inpage-provider'
import { DomainMetadata, NekotonRpcError } from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'

import { BaseConfig, BaseController, BaseState } from './BaseController'
import { ApprovalController } from './ApprovalController'

const POSSIBLE_PERMISSIONS: { [K in Permission]: true } = {
    tonClient: true,
    accountInteraction: true,
}

const MAX_TEMP_ORIGINS = 100

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
    domainMetadata: { [origin: string]: DomainMetadata }
}

function makeDefaultState(): PermissionsState {
    return {
        permissions: {},
        domainMetadata: {},
    }
}

export class PermissionsController extends BaseController<PermissionsConfig, PermissionsState> {
    private pendingMetadataOrigins: Set<string> = new Set()

    constructor(config: PermissionsConfig, state?: PermissionsState) {
        super(config, state || makeDefaultState())
        this.initialize()
    }

    public async initialSync() {
        try {
            let { permissions, domainMetadata } = await window.browser.storage.local.get([
                'permissions',
                'domainMetadata',
            ])

            if (typeof permissions !== 'object') {
                permissions = {}
            }
            if (typeof domainMetadata !== 'object') {
                domainMetadata = {}
            }

            this.update({
                permissions,
                domainMetadata,
            })

            for (const origin of Object.keys(permissions)) {
                this.config.notifyDomain?.(origin, {
                    method: 'permissionsChanged',
                    params: { permissions: {} },
                })
            }
        } catch (e: any) {
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
            const originPermissions: Partial<RawPermissions> =
                await this.config.approvalController.addAndShowApprovalRequest({
                    origin,
                    type: 'requestPermissions',
                    requestData: {
                        permissions: uniquePermissions,
                    },
                })

            const newPermissions = {
                ...this.state.permissions,
                [origin]: originPermissions,
            }

            this.update(
                {
                    permissions: newPermissions,
                    domainMetadata: this.state.domainMetadata,
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
        const permissions = { ...this.state.permissions }
        const originPermissions = permissions[origin]
        delete permissions[origin]

        this.update({ permissions, domainMetadata: this.state.domainMetadata }, true)

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

        this.update({ permissions: {}, domainMetadata: this.state.domainMetadata }, true)

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

    public async addDomainMetadata(origin: string, metadata: DomainMetadata) {
        const domainMetadata = { ...this.state.domainMetadata }

        if (this.pendingMetadataOrigins.size >= MAX_TEMP_ORIGINS) {
            const oldOrigin = this.pendingMetadataOrigins.values().next().value
            this.pendingMetadataOrigins.delete(oldOrigin)

            if (this.state.permissions[oldOrigin] == null) {
                delete domainMetadata[oldOrigin]
            }
        }

        this.pendingMetadataOrigins.add(origin)
        domainMetadata[origin] = {
            icon: metadata.icon,
            name: metadata.name,
        }

        await this._saveDomainMetadata()

        this.update({
            domainMetadata,
        })
    }

    private async _savePermissions(): Promise<void> {
        await window.browser.storage.local.set({ permissions: this.state.permissions })
    }

    private async _saveDomainMetadata(): Promise<void> {
        await window.browser.storage.local.set({
            domainMetadata: this.state.domainMetadata,
        })
    }
}
