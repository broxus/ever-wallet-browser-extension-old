import React, { useEffect, useState } from 'react'

import Button from '@popup/components/Button'

import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import Loader from '@popup/components/Loader'
import Modal from '@popup/components/Modal'
import Nav from '@popup/components/Nav'
import AccountSelector from '@popup/components/AccountSelector'

import * as nt from '@nekoton'
import './style.scss'
import { getEnvironmentType } from '@popup/utils/platform'
import { parseError } from '@popup/utils'

interface ISelectLedgerAccount {
    controllerRpc: IControllerRpcClient
    controllerState: ControllerState
    onBack?: () => void
    onSuccess?: () => void
    onNext?: (selected: number[]) => void
}

type LedgerAccountDetails = {
    publicKey: string
    index: number
}

enum ledgerPages {
    'FIRST',
    'NEXT',
    'PREVIOUS',
}

const SelectLedgerAccount: React.FC<ISelectLedgerAccount> = ({
    controllerRpc,
    controllerState,
    onBack,
    onSuccess,
}) => {
    const [selected, setSelected] = useState<number[]>([])
    const [accounts, setAccounts] = useState<LedgerAccountDetails[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()

    const getNewPage = async (page: ledgerPages) => {
        setLoading(true)
        setError('')
        let accountSlice
        try {
            switch (page) {
                case ledgerPages.FIRST:
                    accountSlice = await controllerRpc.getLedgerFirstPage()
                    break
                case ledgerPages.NEXT:
                    accountSlice = await controllerRpc.getLedgerNextPage()
                    break
                case ledgerPages.PREVIOUS:
                    accountSlice = await controllerRpc.getLedgerPreviousPage()
                    break
            }
            setAccounts(accountSlice)
            setCurrentPage(accountSlice?.[0]?.index / 5 + 1)
        } catch (e) {
            setError(parseError(e))
        }
        setLoading(false)
    }

    useEffect(() => {
        getNewPage(ledgerPages.FIRST)
    }, [])

    const addSelectedAccounts = async (indices: number[]) => {
        setError('')

        for (let i = 0; i < indices.length; i++) {
            const accountId = indices[i]
            const contractType = 'SafeMultisigWallet'

            let key: nt.KeyStoreEntry | undefined
            try {
                key = await controllerRpc.createLedgerKey({
                    accountId,
                })

                await controllerRpc.createAccount({
                    name: 'Ledger ' + (accountId + 1),
                    publicKey: key.publicKey,
                    contractType,
                    workchain: 0,
                })
            } catch (e) {
                key && controllerRpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
                setError(parseError(e))
            }
        }
        const windowType = getEnvironmentType()
        if (windowType === 'fullscreen') {
            // window.close()
        } else if (windowType === 'popup') {
            onSuccess && onSuccess()
        }
    }

    return (
        <>
            <h2 className="select-ledger-account__title">Select accounts</h2>
            {loading ? (
                <div className="select-wallet__loader" style={{ marginBottom: '48px' }}>
                    <Loader />
                </div>
            ) : (
                <>
                    <Nav
                        hint={`Page ${currentPage}`}
                        showPrev={currentPage > 1}
                        onClickPrev={() => getNewPage(ledgerPages.PREVIOUS)}
                        showNext
                        onClickNext={() => getNewPage(ledgerPages.NEXT)}
                    />

                    {error && (
                        <Modal
                            onClose={() => {
                                setError(undefined)
                            }}
                            className="enter-password-screen__modal"
                        >
                            <h3 style={{ color: 'black', marginBottom: '18px' }}>
                                Could not connect your Ledger
                            </h3>
                            <div className="check-seed__content-error">{error}</div>
                        </Modal>
                    )}
                    {/*{success && (*/}
                    {/*    <Modal*/}
                    {/*        onClose={() => {*/}
                    {/*            const windowType = getEnvironmentType()*/}
                    {/*            if (windowType === 'fullscreen') {*/}
                    {/*                // window.close()*/}
                    {/*            } else if (windowType === 'popup') {*/}
                    {/*                onSuccess && onSuccess()*/}
                    {/*            }*/}
                    {/*        }}*/}
                    {/*        className="enter-password-screen__modal"*/}
                    {/*    >*/}
                    {/*        <h3 style={{ color: 'black', marginBottom: '18px' }}>*/}
                    {/*            {`Account${*/}
                    {/*                selected.length > 1 ? 's' : ''*/}
                    {/*            } have been successfully added`}*/}
                    {/*        </h3>*/}
                    {/*    </Modal>*/}
                    {/*)}*/}
                    <div>
                        {accounts.map(({ publicKey, index }) => {
                            const checked = selected.includes(index)
                            const preselected = controllerState.storedKeys.hasOwnProperty(publicKey)
                            return (
                                <AccountSelector
                                    key={publicKey}
                                    publicKey={publicKey}
                                    index={index.toString()}
                                    setChecked={() => {
                                        checked
                                            ? setSelected(selected.filter((el) => el !== index))
                                            : setSelected([...selected, index])
                                    }}
                                    checked={checked}
                                    preselected={preselected}
                                />
                            )
                        })}
                    </div>

                    <div className="select-ledger-account__buttons">
                        <Button
                            className="select-ledger-account__buttons-back"
                            text={'Back'}
                            onClick={() => (onBack ? onBack() : {})}
                            white
                        />
                        <Button
                            className="select-ledger-account__buttons-next"
                            text={'Select'}
                            // disabled={selected.length === 0}
                            onClick={() => addSelectedAccounts(selected)}
                        />
                    </div>
                </>
            )}
        </>
    )
}

export default SelectLedgerAccount
