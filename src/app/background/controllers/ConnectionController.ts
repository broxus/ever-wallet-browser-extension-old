import { Mutex } from '@broxus/await-semaphore'
import { NekotonRpcError } from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'
import {
    ConnectionData,
    ConnectionDataItem,
    GqlSocketParams,
    JrpcSocketParams,
} from '@shared/backgroundApi'
import * as nt from '@nekoton'

import { BaseController, BaseConfig, BaseState } from './BaseController'

const NETWORK_PRESETS = {
    [0]: {
        name: 'Mainnet (GQL)',
        group: 'mainnet',
        type: 'graphql',
        data: {
            endpoint: 'https://main.ton.dev/graphql',
            timeout: 60000,
        },
    } as ConnectionData,
    [1]: ({
        name: 'Mainnet (ADNL)',
        group: 'mainnet',
        type: 'jrpc',
        data: {
            endpoint: 'https://jrpc.broxus.com/rpc',
        },
    } as unknown) as ConnectionData,
    [2]: {
        name: 'Testnet (GQL)',
        group: 'testnet',
        type: 'graphql',
        data: {
            endpoint: 'https://net.ton.dev/graphql',
            timeout: 60000,
        },
    } as ConnectionData,
}

const getPreset = (id: number): ConnectionDataItem | undefined => {
    const preset = (NETWORK_PRESETS as { [id: number]: ConnectionData })[id] as
        | ConnectionData
        | undefined
    return preset != null ? { id, ...preset } : undefined
}

export type InitializedConnection = { group: string } & (
    | nt.EnumItem<
          'graphql',
          {
              socket: GqlSocket
              connection: nt.GqlConnection
          }
      >
    | nt.EnumItem<
          'jrpc',
          {
              socket: JrpcSocket
              connection: nt.JrpcConnection
          }
      >
)

export interface ConnectionConfig extends BaseConfig {}

export interface ConnectionControllerState extends BaseState {
    selectedConnection: ConnectionDataItem
}

function makeDefaultState(): ConnectionControllerState {
    return {
        selectedConnection: getPreset(0)!,
    }
}

interface INetworkSwitchHandle {
    // Must be called after all connection usages are gone
    switch(): Promise<void>
}

export class ConnectionController extends BaseController<
    ConnectionConfig,
    ConnectionControllerState
> {
    private _initializedConnection?: InitializedConnection
    // Used to prevent network switch during some working subscriptions
    private _networkMutex: Mutex
    private _release?: () => void
    private _acquiredConnectionCounter: number = 0

    constructor(config: ConnectionConfig, state?: ConnectionControllerState) {
        super(config, state || makeDefaultState())

        this._initializedConnection = undefined
        this._networkMutex = new Mutex()
        this.initialize()
    }

    public async initialSync() {
        if (this._initializedConnection != null) {
            throw new Error('Must not sync twice')
        }

        while (true) {
            const loadedConnectionId = await this._loadSelectedConnectionId()
            if (loadedConnectionId != null) {
                const selectedConnection = getPreset(loadedConnectionId)
                if (selectedConnection != null) {
                    this.update({ selectedConnection }, true)
                }
            }

            try {
                await this.trySwitchingNetwork(this.state.selectedConnection, true)
                return
            } catch (_e) {
                console.error('Failed to select initial connection. Retrying in 5s')
            }

            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 5000)
            })

            console.log('Restarting connection process')
        }
    }

    public async startSwitchingNetwork(params: ConnectionDataItem): Promise<INetworkSwitchHandle> {
        class NetworkSwitchHandle implements INetworkSwitchHandle {
            private readonly _controller: ConnectionController
            private readonly _release: () => void
            private readonly _params: ConnectionDataItem

            constructor(
                controller: ConnectionController,
                release: () => void,
                params: ConnectionDataItem
            ) {
                this._controller = controller
                this._release = release
                this._params = params
            }

            public async switch() {
                await this._controller
                    ._connect(this._params)
                    .then(() => this._release())
                    .catch((e) => {
                        this._release()
                        throw e
                    })
            }
        }

        const release = await this._networkMutex.acquire()
        return new NetworkSwitchHandle(this, release, params)
    }

    public async acquire() {
        requireInitializedConnection(this._initializedConnection)
        await this._acquireConnection()

        return {
            connection: this._initializedConnection,
            release: () => this._releaseConnection(),
        }
    }

    public async use<T>(f: (connection: InitializedConnection) => Promise<T>): Promise<T> {
        requireInitializedConnection(this._initializedConnection)
        await this._acquireConnection()

        return f(this._initializedConnection)
            .then((res) => {
                this._releaseConnection()
                return res
            })
            .catch((err) => {
                this._releaseConnection()
                throw err
            })
    }

    public getAvailableNetworks(): ConnectionDataItem[] {
        return window.ObjectExt.entries(NETWORK_PRESETS).map(([id, value]) => ({
            ...(value as ConnectionData),
            id: ~~id,
        }))
    }

    public makeAvailableNetworksGroup(first: ConnectionDataItem): ConnectionDataItem[] {
        const availableConnections = [first]
        availableConnections.push(
            ...Object.entries(NETWORK_PRESETS)
                .filter(([id, item]) => ~~id != first.id && item.group == first.group)
                .map(([id, item]) => ({ id: ~~id, ...item }))
        )
        return availableConnections
    }

    public async trySwitchingNetwork(first: ConnectionDataItem, allowOtherConnections: boolean) {
        const availableConnections = allowOtherConnections
            ? this.makeAvailableNetworksGroup(first)
            : [first]

        console.log(availableConnections)

        for (const connection of availableConnections) {
            console.log(`Connecting to ${connection.name} ...`)

            try {
                await this.startSwitchingNetwork(connection).then((handle) => handle.switch())
                console.log(`Successfully connected to ${this.state.selectedConnection.name}`)
                return
            } catch (e) {
                console.error('Connection failed:', e)
            }
        }

        throw new Error('Failed to find suitable connection')
    }

    private async _connect(params: ConnectionDataItem) {
        if (this._initializedConnection) {
            if (this._initializedConnection.type === 'graphql') {
                this._initializedConnection.data.connection.free()
            } else if (this._initializedConnection.type == 'jrpc') {
                this._initializedConnection.data.connection.free()
            }
        }

        this._initializedConnection = undefined

        const testConnection = async ({ data: { connection } }: InitializedConnection) => {
            await new Promise<void>((resolve, reject) => {
                // Try to get any account state
                connection
                    .getFullContractState(
                        '-1:0000000000000000000000000000000000000000000000000000000000000000'
                    )
                    .then(() => resolve())
                    .catch((e) => reject(e))

                setTimeout(() => reject(new Error('Connection timeout')), 60000)
            })
        }

        if (params.type === 'graphql') {
            try {
                const socket = new GqlSocket()

                const connection = {
                    group: params.group,
                    type: 'graphql',
                    data: {
                        socket,
                        connection: await socket.connect(params.data),
                    },
                } as InitializedConnection

                await testConnection(connection)

                this._initializedConnection = connection
            } catch (e) {
                throw new NekotonRpcError(
                    RpcErrorCode.INTERNAL,
                    `Failed to create GraphQL connection: ${e.toString()}`
                )
            }
        } else if (params.type === 'jrpc') {
            try {
                const socket = new JrpcSocket()

                const connection = {
                    group: params.group,
                    type: 'jrpc',
                    data: {
                        socket,
                        connection: await socket.connect(params.data),
                    },
                } as InitializedConnection

                await testConnection(connection)

                this._initializedConnection = connection
            } catch (e) {
                throw new NekotonRpcError(
                    RpcErrorCode.INTERNAL,
                    `Failed to create JRPC connection ${e.toString()}`
                )
            }
        } else {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                'Unsupported connection type'
            )
        }

        this.update(
            {
                selectedConnection: params,
            },
            true
        )
        await this._saveSelectedConnectionId()
    }

    private async _acquireConnection() {
        console.debug('_acquireConnection')

        if (this._acquiredConnectionCounter > 0) {
            console.debug('_acquireConnection -> increase')
            this._acquiredConnectionCounter += 1
        } else {
            this._acquiredConnectionCounter = 1
            if (this._release != null) {
                console.warn('mutex is already acquired')
            } else {
                console.debug('_acquireConnection -> await')
                this._release = await this._networkMutex.acquire()
                console.debug('_acquireConnection -> create')
            }
        }
    }

    private _releaseConnection() {
        console.debug('_releaseConnection')

        this._acquiredConnectionCounter -= 1
        if (this._acquiredConnectionCounter <= 0) {
            console.debug('_releaseConnection -> release')
            this._release?.()
            this._release = undefined
        }
    }

    private async _loadSelectedConnectionId(): Promise<number | undefined> {
        return new Promise<number | undefined>((resolve) => {
            chrome.storage.local.get(['selectedConnectionId'], ({ selectedConnectionId }) => {
                if (typeof selectedConnectionId !== 'number') {
                    return resolve(undefined)
                }
                resolve(selectedConnectionId)
            })
        })
    }

    private async _saveSelectedConnectionId(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.storage.local.set(
                { selectedConnectionId: this.state.selectedConnection.id },
                () => {
                    resolve()
                }
            )
        })
    }
}

function requireInitializedConnection(
    connection?: InitializedConnection
): asserts connection is InitializedConnection {
    if (connection == null) {
        throw new NekotonRpcError(
            RpcErrorCode.CONNECTION_IS_NOT_INITIALIZED,
            'Connection is not initialized'
        )
    }
}

export class GqlSocket {
    public async connect(params: GqlSocketParams): Promise<nt.GqlConnection> {
        class GqlSender {
            private readonly params: GqlSocketParams

            constructor(params: GqlSocketParams) {
                this.params = params
            }

            send(data: string, handler: nt.GqlQuery) {
                ;(async () => {
                    try {
                        const response = await fetch(this.params.endpoint, {
                            method: 'post',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: data,
                        }).then((response) => response.text())
                        handler.onReceive(response)
                    } catch (e) {
                        handler.onError(e)
                    }
                })()
            }
        }

        return new nt.GqlConnection(new GqlSender(params))
    }
}

export class JrpcSocket {
    public async connect(params: JrpcSocketParams): Promise<nt.JrpcConnection> {
        class JrpcSender {
            private readonly params: JrpcSocketParams

            constructor(params: JrpcSocketParams) {
                this.params = params
            }

            send(data: string, handler: nt.JrpcQuery) {
                ;(async () => {
                    try {
                        const response = await fetch(this.params.endpoint, {
                            method: 'post',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: data,
                        }).then((response) => response.text())
                        handler.onReceive(response)
                    } catch (e) {
                        handler.onError(e)
                    }
                })()
            }
        }

        return new nt.JrpcConnection(new JrpcSender(params))
    }
}
