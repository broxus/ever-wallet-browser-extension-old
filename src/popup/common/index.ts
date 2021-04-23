import React, { useEffect } from 'react'

export * from './ripple'

import * as nt from '@nekoton'

export enum Step {
    LOADING,
    WELCOME,
    CREATE_NEW_WALLET,
    RESTORE_WALLET,
    MAIN,
    NOTIFICATION_SEND,
}

export const DEFAULT_CONTRACT_TYPE: nt.ContractType = 'SafeMultisigWallet'

export const hideModalOnClick = (ref: React.MutableRefObject<null>, onClose: () => void) => {
    const handleClickOutside = (event: { target: any }) => {
        // @ts-ignore
        if (ref.current && !ref.current.contains(event.target)) {
            onClose()
        }
    }
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    })
}
