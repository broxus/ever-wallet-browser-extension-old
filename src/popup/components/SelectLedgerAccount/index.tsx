import React, { useEffect, useState } from 'react'

import Right from '@popup/img/right-arrow-blue.svg'
import Left from '@popup/img/left-arrow-blue.svg'
import Button from '@popup/components/Button'

import Checkbox from '@popup/components/Checkbox'
import UserAvatar from '@popup/components/UserAvatar'
import { convertAddress, convertTons } from '@shared/utils'

import './style.scss'
import { IControllerRpcClient } from '@popup/utils/ControllerRpcClient'
import { getFirstPage } from '@popup/utils/ledger'

interface ISelectLedgerAccount {
    controllerRpc: IControllerRpcClient
    onBack?: () => void
    onNext?: () => void
}

interface ILedgerAccount {
    checked: boolean
    setChecked: (arg0: boolean) => void
    address: string
    index: number
    // balance: string
}

const LedgerAccount: React.FC<ILedgerAccount> = ({ address, checked, setChecked, index }) => {
    console.log('publicKey', address)
    return (
        <div className="select-ledger-account__account">
            <Checkbox checked={checked} setChecked={setChecked} />
            {/*<UserAvatar address={address} className="select-ledger-account__account-avatar" />*/}
            <div>{index + 1}</div>
            <div>
                <div className="select-ledger-account__account-title">
                    {convertAddress(address)}
                </div>
                {/*<div className="select-ledger-account__account-balance">*/}
                {/*    {convertTons(balance)} TON*/}
                {/*</div>*/}
            </div>
        </div>
    )
}

type LedgerAccountDetails = {
    publicKey: string
    index: number
}

const SelectLedgerAccount: React.FC<ISelectLedgerAccount> = ({ controllerRpc, onBack, onNext }) => {
    const [selected, setSelected] = useState<number[]>([])
    const [accounts, setAccounts] = useState<LedgerAccountDetails[]>([])

    const decrementIndex = async () => {
        try {
            const acc = await controllerRpc.getLedgerPreviousPage()
            setAccounts(acc)
        } catch (e) {
            throw e
        }
    }

    const incrementIndex = async () => {
        try {
            const acc = await controllerRpc.getLedgerNextPage()
            setAccounts(acc)
        } catch (e) {
            throw e
        }
    }

    const getFirstPage = async () => {
        try {
            const acc = await controllerRpc.getLedgerFirstPage()
            setAccounts(acc)
        } catch (e) {
            throw e
        }
    }

    useEffect(() => {
        getFirstPage()
    }, [])

    return (
        <>
            <h2 className="select-ledger-account__title">Select accounts</h2>
            <div className="select-ledger-account__nav">
                <div className="select-ledger-account__nav-button" onClick={decrementIndex}>
                    <img src={Left} alt="" />
                </div>
                <div className="select-ledger-account__nav-button" onClick={incrementIndex}>
                    <img src={Right} alt="" />
                </div>
            </div>
            <div>
                {accounts.map(({ publicKey, index }) => {
                    const checked = selected.includes(index)
                    return (
                        <LedgerAccount
                            key={publicKey}
                            address={publicKey}
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
                    disabled={false}
                    onClick={() => (onBack ? onBack() : {})}
                    white
                />
                <Button
                    className="select-ledger-account__buttons-next"
                    text={'Select'}
                    disabled={false}
                    onClick={() => (onNext ? onNext() : {})}
                />
            </div>
        </>
    )
}

export default SelectLedgerAccount
