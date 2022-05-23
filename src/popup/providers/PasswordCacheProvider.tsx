import * as React from 'react'

import { useRpc } from '@popup/providers/RpcProvider'

const PASSWORD_CHECK_INTERVAL: number = 40000

export const usePasswordCache = (publicKey: string) => {
    const rpc = useRpc()
    const [passwordCached, setPasswordCached] = React.useState<boolean>()

    React.useEffect(() => {
        const destructorState: { timer?: number } = {}

        setPasswordCached(undefined)
        const update = () =>
            rpc
                .isPasswordCached(publicKey)
                .then((cached) => {
                    setPasswordCached(cached)
                    destructorState.timer = self.setTimeout(update, PASSWORD_CHECK_INTERVAL)
                })
                .catch(console.error)

        update().catch(() => {})

        return () => {
            if (destructorState.timer != null) {
                self.clearTimeout(destructorState.timer)
            }
        }
    }, [publicKey])

    return passwordCached
}
