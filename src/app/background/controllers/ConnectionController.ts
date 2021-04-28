import { Mutex } from 'await-semaphore'
import { BaseController, BaseConfig, BaseState } from './BaseController'
import { NekotonRpcError } from '../../../shared/utils'
import { RpcErrorCode } from '../../../shared/errors'
import { GqlSocket } from '../../../shared'
import { ConnectionData, NamedConnectionData } from '../../../shared/models'
import * as nt from '@nekoton'

const CONNECTION_STORE_KEY = 'selectedConnection'

const NETWORK_PRESETS = {
    ['Mainnet']: {
        type: 'graphql',
        data: {
            endpoint: 'https://main.ton.dev/graphql',
            timeout: 60000,
        },
    } as ConnectionData,
    ['Testnet']: {
        type: 'graphql',
        data: {
            endpoint: 'https://net.ton.dev/graphql',
            timeout: 60000,
        },
    } as ConnectionData,
}

const getPreset = <T extends keyof typeof NETWORK_PRESETS>(name: T): NamedConnectionData => ({
    ...NETWORK_PRESETS[name],
    name,
})

export type InitializedConnection = nt.EnumItem<
    'graphql',
    {
        socket: GqlSocket
        connection: nt.GqlConnection
    }
>

export interface ConnectionConfig extends BaseConfig {}

export interface ConnectionState extends BaseState {
    [CONNECTION_STORE_KEY]: NamedConnectionData
}

const defaultState: ConnectionState = {
    [CONNECTION_STORE_KEY]: getPreset('Mainnet'),
}

interface INetworkSwitchHandle {
    // Must be called after all connection usages are gone
    switch(): Promise<void>
}

class AcquiredConnection {
    private readonly _release: () => void
    private _counter: number = 1

    constructor(release: () => void) {
        this._release = release
    }

    public increase() {
        this._counter += 1
    }

    public decrease() {
        this._counter -= 1
        if (this._counter <= 0) {
            this._release()
            return true
        } else {
            return false
        }
    }
}

export class ConnectionController extends BaseController<ConnectionConfig, ConnectionState> {
    private _initializedConnection?: InitializedConnection
    // Used to prevent network switch during some working subscriptions
    private _networkMutex: Mutex
    private _acquiredConnection?: AcquiredConnection

    constructor(config: ConnectionConfig, state?: ConnectionState) {
        super(config, state || defaultState)

        this._initializedConnection = undefined
        this._networkMutex = new Mutex()
        this.initialize()
    }

    public async initialSync() {
        if (this._initializedConnection != null) {
            throw new Error('Must not sync twice')
        }

        await this.startSwitchingNetwork(this.state[CONNECTION_STORE_KEY]).then((handle) =>
            handle.switch()
        )
    }

    public async startSwitchingNetwork(params: NamedConnectionData): Promise<INetworkSwitchHandle> {
        class NetworkSwitchHandle implements INetworkSwitchHandle {
            private readonly _controller: ConnectionController
            private readonly _release: () => void
            private readonly _params: NamedConnectionData

            constructor(
                controller: ConnectionController,
                release: () => void,
                params: NamedConnectionData
            ) {
                this._controller = controller
                this._release = release
                this._params = params
            }

            public async switch() {
                await this._controller._connect(this._params)
                this._release()
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

    public getAvailableNetworks(): NamedConnectionData[] {
        return window.ObjectExt.entries(NETWORK_PRESETS).map(([name, value]) => ({
            ...(value as ConnectionData),
            name,
        }))
    }

    private async _connect(params: NamedConnectionData) {
        if (this._initializedConnection) {
            if (this._initializedConnection.type === 'graphql') {
                this._initializedConnection.data.connection.free()
            }
        }

        this._initializedConnection = undefined

        if (params.type === 'graphql') {
            try {
                const socket = new GqlSocket()

                this._initializedConnection = {
                    type: 'graphql',
                    data: {
                        socket,
                        connection: await socket.connect(params.data),
                    },
                }
            } catch (e) {
                throw new NekotonRpcError(
                    RpcErrorCode.INTERNAL,
                    `Failed to create GraphQL connection: ${e.toString()}`
                )
            }
        } else {
            throw new NekotonRpcError(
                RpcErrorCode.RESOURCE_UNAVAILABLE,
                `Unsupported connection type ${params.type}`
            )
        }

        this.update(
            {
                [CONNECTION_STORE_KEY]: params,
            },
            true
        )
    }

    private async _acquireConnection() {
        console.log('_acquireConnection')

        if (this._acquiredConnection) {
            console.log('_acquireConnection -> increase')
            this._acquiredConnection.increase()
        } else {
            console.log('_acquireConnection -> await')
            const release = await this._networkMutex.acquire()
            console.log('_acquireConnection -> create')
            this._acquiredConnection = new AcquiredConnection(release)
        }
    }

    private _releaseConnection() {
        console.log('_releaseConnection')

        if (this._acquiredConnection?.decrease()) {
            console.log('_releaseConnection -> release')
            this._acquiredConnection = undefined
        }
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
