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
    balance: string
}

const LedgerAccount: React.FC<ILedgerAccount> = ({ address, balance, checked, setChecked }) => {
    return (
        <div className="select-ledger-account__account">
            <Checkbox checked={checked} setChecked={setChecked} />
            <UserAvatar address={address} className="select-ledger-account__account-avatar" />
            <div>
                <div className="select-ledger-account__account-title">
                    {convertAddress(address)}
                </div>
                <div className="select-ledger-account__account-balance">
                    {convertTons(balance)} TON
                </div>
            </div>
        </div>
    )
}

const mockAccounts = [
    {
        address: '0:18b8fdf6bd451196ed70d649786ceb83cfd4a3f7be22f9f1cd09f8f9c80bc21b',
        balance: '20000',
    },
    {
        address: '0:2b68044eb2c8a3cd4d146ef7664ef6a49c099fc5c27c362cf5bd625f507e0410',
        balance: '1000000',
    },
    {
        address: '0:9f69bbae2f592031fee6b3811439259c0a85424d7c0f887958042aa2723daeb1',
        balance: '2001200',
    },
    {
        address: '0:18b8fdf6bd451196ed70d649786ceb83cfd4a3f7be22f9f1tt09f8f9c80bc21b',
        balance: '18000',
    },
    {
        address: '0:18b8fdf6bd451196ed70d649786tteb83cfd4a3f7be22f9f1cd09f8f9c80bc21b',
        balance: '20000',
    },
    {
        address: '0:18b8fdf6bd451196ed70d64978teb83cfd4a3f7bte22f9f1cd09f8f9c80bc21b',
        balance: '18567',
    },
    {
        address: '0:18b8fdf6bd451196ett0d649786ceb83cfd4a3f7be22f9f1cd09f8f9c80bc21b',
        balance: '20000',
    },
]

const SelectLedgerAccount: React.FC<ISelectLedgerAccount> = ({ controllerRpc, onBack, onNext }) => {
    const [currentPage, setCurrentPage] = useState(0)
    // TODO update to list account number
    const [selected, setSelected] = useState<string[]>([])

    const decrementIndex = () => {
        setCurrentPage((currentPage + mockAccounts.length - 1) % mockAccounts.length)
    }

    const incrementIndex = () => {
        setCurrentPage((currentPage + 1) % mockAccounts.length)
    }

    useEffect(() => {
        getFirstPage(controllerRpc)
            .then((r) => {
                console.log(r)
            })
            .catch((err) => {
                console.log(err)
            })
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
                {mockAccounts
                    .slice(currentPage * 5, (currentPage + 1) * 5)
                    .map(({ address, balance }) => {
                        const checked = selected.includes(address)
                        return (
                            <LedgerAccount
                                key={address}
                                address={address}
                                balance={balance}
                                checked={checked}
                                setChecked={() => {
                                    checked
                                        ? setSelected(selected.filter((el) => el !== address))
                                        : setSelected([...selected, address])
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
