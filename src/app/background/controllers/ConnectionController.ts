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
        name: 'Mainnet (GQL 1)',
        group: 'mainnet',
        type: 'graphql',
        data: {
            endpoint: 'https://main.ton.dev/graphql',
            timeout: 60000,
            local: false,
        },
    } as ConnectionData,
    [1]: {
        name: 'Mainnet (GQL 2)',
        group: 'mainnet',
        type: 'graphql',
        data: {
            endpoint: 'https://main2.ton.dev/graphql',
            timeout: 60000,
            local: false,
        },
    } as ConnectionData,
    [2]: {
        name: 'Mainnet (GQL 3)',
        group: 'mainnet',
        type: 'graphql',
        data: {
            endpoint: 'https://main3.ton.dev/graphql',
            timeout: 60000,
            local: false,
        },
    } as ConnectionData,
    [3]: {
        name: 'Mainnet (ADNL)',
        group: 'mainnet',
        type: 'jrpc',
        data: {
            endpoint: 'https://jrpc.broxus.com/rpc',
        },
    } as unknown as ConnectionData,
    [4]: {
        name: 'Testnet',
        group: 'testnet',
        type: 'graphql',
        data: {
            endpoint: 'https://net5.ton.dev/graphql',
            timeout: 60000,
            local: false,
        },
    } as ConnectionData,
    [5]: {
        name: 'fld.ton.dev',
        group: 'fld',
        type: 'graphql',
        data: {
            endpoint: 'https://gql.custler.net/graphql',
            timeout: 60000,
            local: false,
        },
    } as ConnectionData,
    [100]: {
        name: 'Local node',
        group: 'localnet',
        type: 'graphql',
        data: {
            endpoint: 'http://127.0.0.1/graphql',
            timeout: 60000,
            local: true,
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

export interface ConnectionConfig extends BaseConfig {
    clock: nt.ClockWithOffset
}

export interface ConnectionControllerState extends BaseState {
    selectedConnection: ConnectionDataItem
    pendingConnection: ConnectionDataItem | undefined
}

function makeDefaultState(): ConnectionControllerState {
    return {
        selectedConnection: getPreset(0)!,
        pendingConnection: undefined,
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
    private _cancelTestConnection?: () => void

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

        const clockUpdateInterval = 10 * 60 * 1000
        const startUpdatingClockOffset = async () => {
            const clockOffset = await computeClockOffset()
            console.log(`Clock offset: ${clockOffset}`)
            this.config.clock.updateOffset(clockOffset)
            setTimeout(startUpdatingClockOffset, clockUpdateInterval)
        }
        startUpdatingClockOffset().catch(console.error)

        while (true) {
            let loadedConnectionId = await this._loadSelectedConnectionId()
            if (loadedConnectionId == undefined) {
                loadedConnectionId = 0
            }

            const selectedConnection = getPreset(loadedConnectionId)
            if (selectedConnection != null) {
                this.update({ selectedConnection }, true)
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

                this._controller.update({
                    pendingConnection: params,
                })
            }

            public async switch() {
                await this._controller
                    ._connect(this._params)
                    .then(() => {
                        this._controller.update({
                            selectedConnection: this._params,
                            pendingConnection: undefined,
                        })

                        this._release()
                    })
                    .catch((e) => {
                        this._controller.update({
                            pendingConnection: undefined,
                        })

                        this._release()
                        throw e
                    })
            }
        }

        this._cancelTestConnection?.()

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
            } catch (e: any) {
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

        if (params.type !== 'graphql' && params.type !== 'jrpc') {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                'Unsupported connection type'
            )
        }

        enum TestConnectionResult {
            DONE,
            CANCELLED,
        }

        const testConnection = async ({
            data: { connection },
        }: InitializedConnection): Promise<TestConnectionResult> => {
            return new Promise<TestConnectionResult>((resolve, reject) => {
                this._cancelTestConnection = () => resolve(TestConnectionResult.CANCELLED)

                // Try to get any account state
                connection
                    .getFullContractState(
                        '-1:0000000000000000000000000000000000000000000000000000000000000000'
                    )
                    .then(() => resolve(TestConnectionResult.DONE))
                    .catch((e) => reject(e))

                setTimeout(() => reject(new Error('Connection timeout')), 10000)
            }).finally(() => (this._cancelTestConnection = undefined))
        }

        try {
            const { shouldTest, connection, connectionData } = await (params.type === 'graphql'
                ? async () => {
                      const socket = new GqlSocket()
                      const connection = await socket.connect(params.data)

                      return {
                          shouldTest: !params.data.local,
                          connection,
                          connectionData: {
                              group: params.group,
                              type: 'graphql',
                              data: {
                                  socket,
                                  connection,
                              },
                          } as InitializedConnection,
                      }
                  }
                : async () => {
                      const socket = new JrpcSocket()
                      const connection = await socket.connect(params.data)

                      return {
                          shouldTest: true,
                          connection,
                          connectionData: {
                              group: params.group,
                              type: 'jrpc',
                              data: {
                                  socket,
                                  connection,
                              },
                          } as InitializedConnection,
                      }
                  })()

            if (
                shouldTest &&
                (await testConnection(connectionData)) == TestConnectionResult.CANCELLED
            ) {
                connection.free()
                return
            }

            this._initializedConnection = connectionData
            await this._saveSelectedConnectionId(params.id)
        } catch (e: any) {
            throw new NekotonRpcError(
                RpcErrorCode.INTERNAL,
                `Failed to create connection: ${e.toString()}`
            )
        }
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
        const { selectedConnectionId } = await window.browser.storage.local.get([
            'selectedConnectionId',
        ])
        if (typeof selectedConnectionId === 'number') {
            return selectedConnectionId
        } else {
            return undefined
        }
    }

    private async _saveSelectedConnectionId(connectionId: number): Promise<void> {
        await window.browser.storage.local.set({ selectedConnectionId: connectionId })
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

            isLocal(): boolean {
                return this.params.local
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
                    } catch (e: any) {
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
                    } catch (e: any) {
                        handler.onError(e)
                    }
                })()
            }
        }

        return new nt.JrpcConnection(new JrpcSender(params))
    }
}

const ntp = (now: number, server: number, then: number) => server - (now + then) / 2

async function computeClockOffset(): Promise<number> {
    try {
        const now = Date.now()
        const { server, then } = await new Promise<{ server: number; then: number }>(
            (resolve, reject) => {
                fetch('https://jrpc.broxus.com')
                    .then((body) => {
                        const then = Date.now()
                        body.text().then((timestamp) =>
                            resolve({
                                server: parseInt(timestamp, undefined),
                                then,
                            })
                        )
                    })
                    .catch(reject)
                setTimeout(() => reject(new Error('Clock offset resolution timeout')), 5000)
            }
        )

        return ntp(now, server, then)
    } catch (e) {
        console.warn('Failed to compute clock offset:', e)
        return 0
    }
}
