import * as React from 'react'
import { connect } from 'react-redux'

import init, * as nt from '@nekoton'
import { LoaderPage } from '@popup/components/LoaderPage'
import { useRpc } from '@popup/providers/RpcProvider'
import { fetchManifest } from '@popup/store/app/actions'
import { AppState, StoreAction } from '@popup/store/app/types'
import {
    ENVIRONMENT_TYPE_BACKGROUND,
    ENVIRONMENT_TYPE_FULLSCREEN,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_POPUP,
} from '@shared/constants'
import { ControllerState } from '@popup/utils/ControllerRpcClient'

export type ActiveTab =
    | nt.EnumItem<
          typeof ENVIRONMENT_TYPE_POPUP,
          {
              id?: number
              title?: string
              origin: string
              protocol?: string
              url?: string
          }
      >
    | nt.EnumItem<typeof ENVIRONMENT_TYPE_NOTIFICATION, undefined>
    | nt.EnumItem<
          typeof ENVIRONMENT_TYPE_FULLSCREEN,
          {
              route?: string
          }
      >
    | nt.EnumItem<typeof ENVIRONMENT_TYPE_BACKGROUND, undefined>

type Props = {
    children: React.ReactNode
    group?: string
    activeTab: ActiveTab
    fetchManifest: StoreAction<typeof fetchManifest>
}

type ContextConsumer = {
    activeTab?: ActiveTab
    group?: string
    loaded: boolean
    state: ControllerState
}

export const closeCurrentWindow = () => {
    chrome.windows.getCurrent((windowDetails) => {
        chrome.windows.remove(windowDetails.id)
    })
}

export const Context = React.createContext<ContextConsumer>({
    activeTab: undefined,
    loaded: false,
    state: {} as ControllerState,
})

export function useRpcState() {
    return React.useContext(Context)
}

function Provider({ children, group, activeTab, fetchManifest }: Props): JSX.Element {
    const rpc = useRpc()

    const [loaded, setLoaded] = React.useState(false)
    const [state, setState] = React.useState<ControllerState>({} as ControllerState)

    React.useEffect(() => {
        console.log(state, 'controllerState')
    })

    React.useEffect(() => {
        ;(async () => {
            const [, state] = await Promise.all([
                init('index_bg.wasm'),
                (async () => {
                    rpc.onNotification((data) => {
                        const stateToUpdate = data.params

                        // if (
                        //     activeTab.type === 'notification' &&
                        //     Object.keys((stateToUpdate as any).pendingApprovals).length === 0
                        // ) {
                        //     closeCurrentWindow()
                        // }
                        // else {
                        //     console.log('Got state', stateToUpdate)
                        //     setState(stateToUpdate as any)
                        // }

                        try {
                            console.log('Got state', stateToUpdate)
                            setState(stateToUpdate as ControllerState)
                        } catch (e) {
                            console.log(e.toString())
                        }
                    })

                    return await rpc.getState()
                })(),
            ])

            if (
                state.selectedAccount == null &&
                (activeTab.type === 'popup' || activeTab.type === 'notification')
            ) {
                await rpc.openExtensionInBrowser({})
                window.close()
            } else if (
                state.selectedAccount != null &&
                activeTab.type === 'fullscreen' &&
                activeTab.data.route == null
            ) {
                window.close()
            } else {
                setState(state)
            }

            setLoaded(true)

            fetchManifest().catch(console.error)
        })()
    }, [])

    if (!loaded) {
        return <LoaderPage />
    }

    return (
        <Context.Provider value={{ group, activeTab, loaded, state }}>{children}</Context.Provider>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    tokensManifest: store.app.tokensManifest,
})

export const RpcStateProvider = connect(mapStateToProps, {
    fetchManifest,
})(Provider)
