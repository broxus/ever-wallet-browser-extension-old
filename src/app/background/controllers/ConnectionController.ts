import { Mutex } from 'await-semaphore'
import { BaseController, BaseConfig, BaseState } from './BaseController'
import { NekotonRpcError, RpcErrorCode } from '../../../shared/utils'
import { GqlSocket, GqlSocketParams } from '../../../shared'
import * as nt from '@nekoton'

const CONNECTION_STORE_KEY = 'selectedConnection'

export type ConnectionData = nt.EnumItem<'graphql', GqlSocketParams>

type InitializedConnection = nt.EnumItem<
    'graphql',
    {
        socket: GqlSocket
        connection: nt.GqlConnection
    }
>

export interface ConnectionConfig extends BaseConfig {}

export interface ConnectionState extends BaseState {
    [CONNECTION_STORE_KEY]: ConnectionData
}

const defaultState: ConnectionState = {
    [CONNECTION_STORE_KEY]: {
        type: 'graphql',
        data: {
            endpoint: 'https://main.ton.dev/graphq',
            timeout: 60000, // 60s
        },
    },
}

interface INetworkSwitchHandle {
    // Must be called after all connection usages are gone
    switch(): Promise<void>
}

export class ConnectionController extends BaseController<ConnectionConfig, ConnectionState> {
    private _initializedConnection?: InitializedConnection
    private _connectionMutex: Mutex

    constructor(config: ConnectionConfig, state?: ConnectionState) {
        super(config, state || defaultState)

        this._initializedConnection = undefined
        this._connectionMutex = new Mutex()
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

    public async startSwitchingNetwork(params: ConnectionData): Promise<INetworkSwitchHandle> {
        class NetworkSwitchHandle implements INetworkSwitchHandle {
            private readonly _controller: ConnectionController
            private readonly _release: () => void
            private readonly _params: ConnectionData

            constructor(
                controller: ConnectionController,
                release: () => void,
                params: ConnectionData
            ) {
                this._controller = controller
                this._release = release
                this._params = params
            }

            public async switch() {
                await this._controller._connect(this._params)
            }
        }

        const release = await this._connectionMutex.acquire()
        return new NetworkSwitchHandle(this, release, params)
    }

    private async _connect(params: ConnectionData) {
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
}
