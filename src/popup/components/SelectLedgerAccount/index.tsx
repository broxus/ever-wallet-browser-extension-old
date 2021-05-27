import React, { useEffect, useState } from 'react'

import Right from '@popup/img/right-arrow-blue.svg'
import Left from '@popup/img/left-arrow-blue.svg'
import Button from '@popup/components/Button'

import Checkbox from '@popup/components/Checkbox'
import UserAvatar from '@popup/components/UserAvatar'
import { convertAddress, convertTons } from '@shared/utils'

import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import Loader from '@popup/components/Loader'
import Modal from '@popup/components/Modal'

import * as nt from '@nekoton'
import './style.scss'

interface ISelectLedgerAccount {
    controllerRpc: IControllerRpcClient
    onBack?: () => void
    onNext?: (selected: number[]) => void
}

interface ILedgerAccount {
    checked: boolean
    setChecked: (arg0: boolean) => void
    publicKey: string
    index: number
    // balance: string
}

const LedgerAccount: React.FC<ILedgerAccount> = ({ publicKey, checked, setChecked, index }) => {
    return (
        <div className="select-ledger-account__account">
            <Checkbox checked={checked} setChecked={setChecked} />
            <UserAvatar
                address={nt.computeTonWalletAddress(publicKey, 'SafeMultisigWallet', 0)}
                className="select-ledger-account__account-avatar"
            />
            <span className="select-ledger-account__account-index">{index + 1}</span>
            {/*<div>*/}
            <span className="select-ledger-account__account-public-key">
                {convertAddress(publicKey)}
            </span>
            {/*<div className="select-ledger-account__account-balance">*/}
            {/*    {convertTons(balance)} TON*/}
            {/*</div>*/}
            {/*</div>*/}
        </div>
    )
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

const SelectLedgerAccount: React.FC<ISelectLedgerAccount> = ({ controllerRpc, onBack }) => {
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
            setError(e.toString())
        }
        setLoading(false)
    }

    useEffect(() => {
        getNewPage(ledgerPages.FIRST)
    }, [])

    const logIndices = (indices: any) => {
        console.log(indices, 'indices')
    }

    const addSelectedAccounts = async (indices: number[]) => {
        console.log('creating accounts')

        for (let i = 0; i < indices.length; i++) {
            const accountId = indices[i]
            const contractType = 'SafeMultisigWallet'

            let key: nt.KeyStoreEntry | undefined
            try {
                key = await controllerRpc.createLedgerKey({
                    accountId,
                })

                await controllerRpc.createAccount({
                    name: 'Ledger ' + accountId,
                    publicKey: key.publicKey,
                    contractType,
                })
                console.log('account created')
            } catch (e) {
                key && controllerRpc.removeKey({ publicKey: key.publicKey }).catch(console.error)
            }
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
                    <div className="select-ledger-account__nav">
                        <span className="select-ledger-account__nav-page">{`Page ${currentPage}`}</span>
                        <div style={{ display: 'flex' }}>
                            {currentPage > 1 && (
                                <div
                                    className="select-ledger-account__nav-button"
                                    onClick={() => getNewPage(ledgerPages.PREVIOUS)}
                                >
                                    <img src={Left} alt="" />
                                </div>
                            )}
                            <div
                                className="select-ledger-account__nav-button"
                                onClick={() => getNewPage(ledgerPages.NEXT)}
                            >
                                <img src={Right} alt="" />
                            </div>
                        </div>
                    </div>
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
                    <div>
                        {accounts.map(({ publicKey, index }) => {
                            const checked = selected.includes(index)
                            return (
                                <LedgerAccount
                                    key={publicKey}
                                    publicKey={publicKey}
                                    index={index}
                                    checked={checked}
                                    setChecked={() => {
                                        checked
                                            ? setSelected(selected.filter((el) => el !== index))
                                            : setSelected([...selected, index])
                                    }}
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
