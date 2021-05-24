import React, { useRef, useState } from 'react'

import Button from '@popup/components/Button'
import ConnectLedger from '@popup/components/ConnectLedger'
import SelectLedgerAccount from '@popup/components/SelectLedgerAccount'
import Loader from '@popup/components/Loader'
import * as nt from '@nekoton'
import { AccountToCreate, KeyToRemove, LedgerKeyToCreate } from '@shared/approvalApi'

const LEDGER_BRIDGE_URL = 'https://broxus.github.io/ton-ledger-bridge'

interface ISelectWallet {
    onSubmit: () => void
    onBack?: () => void
    onSkip?: () => void
    createLedgerKey: (params: LedgerKeyToCreate) => Promise<nt.KeyStoreEntry>
    removeKey: (params: KeyToRemove) => Promise<nt.KeyStoreEntry | undefined>
    createAccount: (params: AccountToCreate) => Promise<nt.AssetsList>
    selectAccount: (params: string) => Promise<void>
    getLedgerFirstPage: () => Promise<{publicKey: string, index: number}[]>
}

const SelectLedgerKey: React.FC<ISelectWallet> = ({ onSubmit, onBack, onSkip, createLedgerKey, removeKey, createAccount, selectAccount, getLedgerFirstPage}) => {
    const ref = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)

    const getFirstPage = async () => {
        try {
            let ledgerFirstPage = await getLedgerFirstPage()
            console.log(ledgerFirstPage)
        } catch (e) {

        }
    }

    const createLedgerAccount = async () => {
        const accountId = 0
        const contractType = "SafeMultisigWallet"

        let key: nt.KeyStoreEntry | undefined
        try {
            key = await createLedgerKey({
                accountId,
            })

            await createAccount({ name: "Ledger " + accountId, publicKey: key.publicKey, contractType })
        } catch (e) {
            key && removeKey({ publicKey: key.publicKey }).catch(console.error)
        }
    }

    const selectAnyAccount = async () => {
        try {
            const mockAddr = '0:aafa193fdf6c11cd20a0831ae2a33f7ff4a5add95db7b7b30e7ceef6538e2621'
            await selectAccount(mockAddr)
        } catch (e) {

        }
    }

    return (
        <div className="select-wallet">
            <div className="select-wallet__content">
                <div className="select-wallet__content-options">
                    {/*<ConnectLedger onBack={onBack} onNext={onSubmit} />*/}
                    {/*<SelectLedgerAccount onBack={onBack} onNext={onSubmit} />*/}
                    {loading && (
                        <div className="select-wallet__loader">
                            <Loader />
                        </div>
                    )}
                    <iframe
                        allow="hid"
                        height="270px"
                        src={LEDGER_BRIDGE_URL}
                        ref={ref}
                        onLoad={() => {
                            setLoading(false)
                            const message = {
                                target: 'LEDGER-IFRAME',
                                action: 'ledger-get-configuration',
                            }

                            const handleMessage = (reply: any) => {
                                console.log("handleMessage")
                                if (reply.data?.success === true) {
                                    console.log("Ledger Bridge Data: ", reply.data?.payload)
                                } else {
                                    console.log("Ledger Bridge Error: ", reply.data?.error)
                                }
                                //window.removeEventListener('message', handleMessage)
                            }
                            window.addEventListener('message', handleMessage)

                            ref.current?.contentWindow?.postMessage(message, '*')
                        }}
                    />
                </div>
                <div className="select-wallet__content-buttons">
                    <Button text={'Next'} disabled={false} onClick={() => onSubmit()} />
                    {onBack && <Button text={'Back'} white onClick={onBack} />}
                    {onSkip && <Button text={'Skip'} white onClick={onSkip} />}
                </div>
            </div>
        </div>
    )
}

export default SelectLedgerKey
