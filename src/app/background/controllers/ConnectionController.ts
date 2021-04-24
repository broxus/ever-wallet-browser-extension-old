import { BaseController, BaseConfig, BaseState } from './BaseController'
import { NekotonRpcError, RpcErrorCode } from '../../../shared/utils'
import { GqlSocket, GqlSocketParams } from '../../../shared'
import * as nt from '@nekoton'

const CONNECTION_STORE_KEY = 'selectedConnection'

type ConnectionData = nt.EnumItem<'graphql', GqlSocketParams>
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
            endpoint: 'https://main.ton.dev/graphql',
            timeout: 60000, // 60s
        },
    },
}

export class ConnectionController extends BaseController<ConnectionConfig, ConnectionState> {
    private _initializedConnection?: InitializedConnection

    constructor(config: ConnectionConfig, state?: ConnectionState) {
        super(config, state)
    }

    private _connect(params: ConnectionData) {
        if (this._initializedConnection) {
            if (this._initializedConnection.type === 'graphql') {
                this._initializedConnection.data.connection.free()
            }
        }
    }
}
