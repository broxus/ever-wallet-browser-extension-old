import * as React from 'react'

export * from './ripple'

import * as nt from '@nekoton'

export const DEFAULT_CONTRACT_TYPE: nt.ContractType = 'EverWallet'

export const hideModalOnClick = (
    ref: React.MutableRefObject<null>,
    buttonRef: React.MutableRefObject<null> | undefined,
    onClose: () => void
) => {
    const handleClickOutside = (event: { target: any }) => {
        if (
            ref.current &&
            // @ts-ignore
            !ref.current.contains(event.target) &&
            // @ts-ignore
            (buttonRef == null || !buttonRef.current.contains(event.target))
        ) {
            onClose()
        }
    }

    React.useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    })
}
