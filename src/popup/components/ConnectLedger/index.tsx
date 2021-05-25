import React, { useEffect, useRef, useState } from 'react'

import Button from '@popup/components/Button'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import Loader from '@popup/components/Loader'

const LEDGER_BRIDGE_URL = 'https://broxus.github.io/ton-ledger-bridge'

interface ISelectWallet {
    onNext: () => void
    onBack?: () => void
    // onSkip?: () => void
}

const ConnectLedger: React.FC<ISelectWallet> = ({ onNext, onBack }) => {
    const ref = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)

    // window.location.href = '/home.html'

    // const getFirstPage = async () => {
    //     try {
    //         let ledgerFirstPage = await getLedgerFirstPage()
    //         console.log(ledgerFirstPage)
    //     } catch (e) {
    //
    //     }
    // }
    //
    // const createLedgerAccount = async () => {
    //     const accountId = 0
    //     const contractType = "SafeMultisigWallet"
    //
    //     let key: nt.KeyStoreEntry | undefined
    //     try {
    //         key = await createLedgerKey({
    //             accountId,
    //         })
    //
    //         await createAccount({ name: "Ledger " + accountId, publicKey: key.publicKey, contractType })
    //     } catch (e) {
    //         key && removeKey({ publicKey: key.publicKey }).catch(console.error)
    //     }
    // }
    //
    // const selectAnyAccount = async () => {
    //     try {
    //         const mockAddr = '0:aafa193fdf6c11cd20a0831ae2a33f7ff4a5add95db7b7b30e7ceef6538e2621'
    //         await selectAccount(mockAddr)
    //     } catch (e) {
    //
    //     }
    // }

    const handleMessage = (reply: any) => {
        console.log('handleMessage')
        if (reply.data?.success === true) {
            console.log('Ledger Bridge Data: ', reply.data?.payload)
            onNext && onNext()
        } else {
            console.log('Ledger Bridge Error: ', reply.data?.error.message)
            // onBack && onBack()
        }
        //window.removeEventListener('message', handleMessage)
    }

    // useEffect(() => {
    //     console.log(window, 'window')
    // }, [])

    useEffect(() => {
        return () => {
            document.removeEventListener('message', handleMessage)
        }
    }, [])

    const addListener = () => {
        setLoading(false)

        const message = {
            target: 'LEDGER-IFRAME',
            action: 'ledger-get-configuration',
        }
        document.addEventListener('message', handleMessage)
        ref.current?.contentWindow?.postMessage(message, '*')
    }

    return (
        <div className="select-wallet">
            <div className="select-wallet__content" style={{ padding: '0' }}>
                <div className="select-wallet__content-options" style={{ height: '100%' }}>
                    {/*<SelectLedgerAccount onBack={onBack} onNext={onSubmit} />*/}
                    {loading && (
                        <div className="select-wallet__loader">
                            <Loader />
                        </div>
                    )}
                    <iframe
                        allow="hid"
                        height="290px"
                        src={LEDGER_BRIDGE_URL}
                        ref={ref}
                        onLoad={() => addListener()}
                    />
                </div>
                {/*<div className="select-wallet__content-buttons">*/}
                {/*    <Button text={'Next'} disabled={false} onClick={() => onSubmit()} />*/}
                {/*    {onBack && <Button text={'Back'} white onClick={onBack} />}*/}
                {/*    {onSkip && <Button text={'Skip'} white onClick={onSkip} />}*/}
                {/*</div>*/}
            </div>
        </div>
    )
}

export default ConnectLedger
