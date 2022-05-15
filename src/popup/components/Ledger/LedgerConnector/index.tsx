import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'

import Button from '@popup/components/Button'
import PanelLoader from '@popup/components/PanelLoader'
import { LEDGER_BRIDGE_URL } from '@shared/constants'
import { ModalError } from '@popup/components/Ledger/Modal'
import { useRpc } from '@popup/providers/RpcProvider'

import './index.scss'
import { useIntl } from 'react-intl'

interface ISelectWallet {
    theme?: 'sign-in'
    onNext: () => void
    onBack?: () => void
}

const LedgerConnector: React.FC<ISelectWallet> = ({ onNext, onBack, theme }) => {
    const intl = useIntl()
    const rpc = useRpc()
    const ref = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>()

    const handleMessage = async (reply: any): Promise<void> => {
        setError('')
        setLoading(true)

        if (!reply.data?.success) {
            console.log('Ledger Bridge Error: ', reply.data?.error.message)
            setError(reply.data?.error.message)
        } else {
            try {
                await rpc.getLedgerFirstPage()
                console.log('Ledger Bridge Data: ', reply.data?.payload)
                onNext && onNext()
            } catch (e) {
                console.log('Ledger Bridge Error: ', e)
                setError(intl.formatMessage({ id: 'ERROR_FAILED_TO_CONNECT_TO_LEDGER' }))
            }
        }

        setLoading(false)
    }

    useEffect(() => {
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    return (
        <>
            <ModalError
                error={error}
                onClose={() => {
                    setError('')
                }}
            />

            <div className={classNames('ledger-connector', theme)}>
                <div className="ledger-connector__content">
                    {loading && (
                        <PanelLoader
                            paddings={theme !== 'sign-in'}
                            transparent={theme === 'sign-in'}
                        />
                    )}

                    <iframe
                        ref={ref}
                        allow="hid"
                        height="300px"
                        src={LEDGER_BRIDGE_URL}
                        className={classNames('ledger-connector__iframe', {
                            'ledger-connector__iframe_blocked': !!error,
                        })}
                        onLoad={() => {
                            setLoading(false)
                            window.addEventListener('message', handleMessage)
                        }}
                    />
                </div>

                <div className="ledger-connector__footer">
                    <Button
                        text={intl.formatMessage({ id: 'BACK_BTN_TEXT' })}
                        white
                        onClick={onBack}
                    />
                </div>
            </div>
        </>
    )
}

export default LedgerConnector
