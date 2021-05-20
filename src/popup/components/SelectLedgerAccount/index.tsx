import React, { useState } from 'react'

import Right from '@popup/img/right-arrow-blue.svg'
import Left from '@popup/img/left-arrow-blue.svg'
import Button from '@popup/components/Button'

import './style.scss'
import Checkbox from '@popup/components/Checkbox'
import UserAvatar from '@popup/components/UserAvatar'
import { convertAddress, convertTons } from '@shared/utils'

interface ISelectLedgerAccount {
    onBack?: () => void
    onNext?: () => void
}

// TODO update types
interface ILedgerAccount {
    address: string
    balance: string
}

const LedgerAccount: React.FC<ILedgerAccount> = ({ address, balance }) => {
    const [checked, setChecked] = useState(false)
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
        address: '0:18b8fdf6bd451196ed70d649786ceb83cfd4a3f7be22f9f1cd09f8f9c80bc21b',
        balance: '18000',
    },
    {
        address: '0:18b8fdf6bd451196ed70d649786ceb83cfd4a3f7be22f9f1cd09f8f9c80bc21b',
        balance: '20000',
    },
    {
        address: '0:18b8fdf6bd451196ed70d649786ceb83cfd4a3f7be22f9f1cd09f8f9c80bc21b',
        balance: '20000',
    },
    {
        address: '0:18b8fdf6bd451196ed70d649786ceb83cfd4a3f7be22f9f1cd09f8f9c80bc21b',
        balance: '20000',
    },
]

const SelectLedgerAccount: React.FC<ISelectLedgerAccount> = ({ onBack, onNext }) => {
    const [currentPage, setCurrentPage] = useState(0)

    //MOCK
    const pages = new Array('100')

    const decrementIndex = () => {
        setCurrentPage((currentPage + pages.length - 1) % pages.length)
    }

    const incrementIndex = () => {
        setCurrentPage((currentPage + 1) % pages.length)
    }

    return (
        <>
            <h2 className="select-ledger-account__title">Select accounts</h2>
            <div className="select-ledger-account__nav">
                <div className="select-ledger-account__nav-button" onClick={decrementIndex}>
                    <Left />
                </div>
                <div className="select-ledger-account__nav-button" onClick={incrementIndex}>
                    <Right />
                </div>
            </div>
            <div>
                {mockAccounts.map(({ address, balance }) => (
                    <LedgerAccount key={address} address={address} balance={balance} />
                ))}
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
