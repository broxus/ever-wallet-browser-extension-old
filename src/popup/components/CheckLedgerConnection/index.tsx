import React, { useEffect, useRef, useState } from 'react'
import Loader from '@popup/components/Loader'
import './style.scss'
import { LEDGER_BRIDGE_URL } from '@shared/constants'

interface ICheckLedgerConnection {
    onSuccess: () => void
    onFailed: () => void
}

const CheckLedgerConnection: React.FC<ICheckLedgerConnection> = ({ onSuccess, onFailed }) => {
    const ref = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)

    const handleMessage = (reply: any) => {
        if (reply.data?.success === true) {
            onSuccess && onSuccess()
        } else {
            onFailed && onFailed()
        }
    }

    useEffect(() => {
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    const sendMessage = () => {
        setLoading(false)

        const message = {
            target: 'LEDGER-IFRAME',
            action: 'ledger-get-configuration',
        }
        window.addEventListener('message', handleMessage)
        ref.current?.contentWindow?.postMessage(message, '*')
    }

    return (
        <>
            {loading && (
                <div className="select-wallet__loader">
                    <Loader />
                </div>
            )}
            <iframe
                allow="hid"
                className="hidden"
                src={LEDGER_BRIDGE_URL}
                ref={ref}
                onLoad={() => sendMessage()}
            />
        </>
    )
}

export default CheckLedgerConnection
