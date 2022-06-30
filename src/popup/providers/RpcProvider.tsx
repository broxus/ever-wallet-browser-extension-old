import * as React from 'react'

import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

type Props = {
    children: React.ReactNode
    connection: IControllerRpcClient
}

export const Context = React.createContext<IControllerRpcClient>({} as IControllerRpcClient)

export function useRpc() {
    return React.useContext(Context)
}

export function RpcProvider({ children, connection }: Props): JSX.Element {
    return <Context.Provider value={connection}>{children}</Context.Provider>
}
