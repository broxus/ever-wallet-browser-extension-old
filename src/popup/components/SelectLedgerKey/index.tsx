import React, { useRef, useState } from 'react'
import { EventEmitter } from 'events'

import Button from '@popup/components/Button'

const LEDGER_BRIDGE_URL = 'https://pashinov.github.io/ton-ledger-bridge'

interface ISelectWallet {
    onSubmit: (publicKey: string) => void
    onBack?: () => void
    onSkip?: () => void
}

const SelectLedgerKey: React.FC<ISelectWallet> = ({ onSubmit, onBack, onSkip }) => {
    const [publicKey, setPublicKey] = useState<string>()
    const ref = useRef<HTMLIFrameElement>(null)

    return (
        <div className="select-wallet">
            <div className="select-wallet__content">
                <div className="select-wallet__content-options">
                    <h2 className="select-wallet__content-options-title">Connect ledger</h2>
                    <iframe
                        allow="hid"
                        src={LEDGER_BRIDGE_URL}
                        ref={ref}
                        onLoad={() => {
                            const message = {
                                target: 'LEDGER-IFRAME',
                                action: 'ledger-get-public-key',
                                params: {
                                    account: 0,
                                },
                            }

                            const handleMessage = (reply: any) => {
                                if (reply.data?.success === true) {
                                    setPublicKey(reply?.data?.payload.publicKey)
                                }

                                window.removeEventListener('message', handleMessage)
                            }
                            window.addEventListener('message', handleMessage)

                            ref.current?.contentWindow?.postMessage(message, '*')
                        }}
                    />
                </div>
                <div className="select-wallet__content-buttons">
                    <Button
                        text={'Next'}
                        disabled={publicKey == null}
                        onClick={() => onSubmit(publicKey!)}
                    />
                    {onBack && <Button text={'Back'} white onClick={onBack} />}
                    {onSkip && <Button text={'Skip'} white onClick={onSkip} />}
                </div>
            </div>
        </div>
    )
}

export default SelectLedgerKey
