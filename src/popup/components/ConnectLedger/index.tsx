import React, { useEffect, useRef, useState } from 'react'

import Button from '@popup/components/Button'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import Loader from '@popup/components/Loader'
import { LEDGER_BRIDGE_URL } from '@popup/constants/ledger-url'
import Modal from '@popup/components/Modal'

interface ISelectWallet {
    onNext: () => void
    onBack?: () => void
    // onSkip?: () => void
}

const ConnectLedger: React.FC<ISelectWallet> = ({ onNext }) => {
    const ref = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)
    // const [error, setError] = useState<string>()

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
        if (reply.data?.success === true) {
            console.log('Ledger Bridge Data: ', reply.data?.payload)
            onNext && onNext()
        } else {
            console.log('Ledger Bridge Error: ', reply.data?.error.message)
            // setError(reply.data.error.message)
            // onBack && onBack()
        }
    }

    useEffect(() => {
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    return (
        <div className="select-wallet">
            <div className="select-wallet__content" style={{ padding: '0' }}>
                <div className="select-wallet__content-options" style={{ height: '100%' }}>
                    {loading && (
                        <div className="select-wallet__loader">
                            <Loader />
                        </div>
                    )}

                    <iframe
                        allow="hid"
                        height="100%"
                        src={LEDGER_BRIDGE_URL}
                        ref={ref}
                        onLoad={() => {
                            setLoading(false)
                            const message = {
                                target: 'LEDGER-IFRAME',
                                action: 'ledger-get-configuration',
                            }
                            // setError('')
                            window.addEventListener('message', handleMessage)
                            ref.current?.contentWindow?.postMessage(message, '*')
                        }}
                    />
                </div>
                {/*{error && (*/}
                {/*    <Modal*/}
                {/*        onClose={() => {*/}
                {/*            setError(undefined)*/}
                {/*        }}*/}
                {/*        className="enter-password-screen__modal"*/}
                {/*    >*/}
                {/*        <h3 style={{ color: 'black', marginBottom: '18px' }}>*/}
                {/*            Could not connect your Ledger*/}
                {/*        </h3>*/}
                {/*        <div className="check-seed__content-error">{error}</div>*/}
                {/*    </Modal>*/}
                {/*)}*/}
            </div>
        </div>
    )
}

export default ConnectLedger
