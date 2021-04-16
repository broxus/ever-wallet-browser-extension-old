import React from 'react'
import { convertAddress, convertTons } from '@utils'
import Decimal from 'decimal.js'
import * as nt from '@nekoton'

import TonLogoS from '@img/ton-logo-s.svg'

type TransactionProps = {
    transaction: nt.Transaction
    additionalInfo?: 'staking_reward'
}

const extractValue = (transaction: nt.Transaction) => {
    const outgoing = transaction.outMessages.reduce(
        (total, msg) => total.add(msg.value),
        new Decimal(0)
    )
    return new Decimal(transaction.inMessage.value).sub(outgoing)
}

const extractAddress = (transaction: nt.Transaction) => {
    if (transaction.outMessages.length > 0) {
        for (const item of transaction.outMessages) {
            if (item.dst != null) {
                return item.dst
            }
        }
        return undefined
    } else if (transaction.inMessage.src != null) {
        return transaction.inMessage.src
    } else {
        return transaction.inMessage.dst
    }
}

const Transaction: React.FC<TransactionProps> = ({ transaction, additionalInfo }) => {
    const value = extractValue(transaction)
    const address = extractAddress(transaction)

    return (
        <>
            <div className="main-page__user-assets-asset">
                <div style={{ display: 'flex', width: '100%' }}>
                    <div style={{ marginRight: '16px', marginTop: '16px', minWidth: '36px' }}>
                        <TonLogoS />
                    </div>
                    <div className="main-page__user-assets-asset-number">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-dollars">
                                {new Date(transaction.createdAt * 1000).toLocaleTimeString()}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-amount">
                                {address && convertAddress(address)}
                            </span>
                            <span
                                className={`main-page__user-assets-asset-number-${
                                    value.lessThan(0) ? 'expense' : 'income'
                                }`}
                            >
                                {convertTons(value.toString())} TON
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="main-page__user-assets-asset-number-dollars">
                                Fees: {convertTons(transaction.totalFees)} TON
                            </span>
                        </div>
                        {additionalInfo && (
                            <span
                                className="main-page__user-assets-asset-number-dollars"
                                style={{ color: '#000000', padding: '10px 0 0' }}
                            >
                                Staking reward.
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Transaction
