import React from 'react'
import { convertAddress, convertTons } from '@utils'
import * as nt from '@nekoton'

import TonLogoS from '@img/ton-logo-s.svg'

type TransactionProps = {
    transaction: nt.Transaction
    additionalInfo?: 'staking_reward'
}

const Transaction: React.FC<TransactionProps> = ({ transaction, additionalInfo }) => {
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
                                {transaction.inMessage.src &&
                                    convertAddress(transaction.inMessage.src)}
                            </span>
                            <span className="main-page__user-assets-asset-number-income">
                                + {convertTons(transaction.inMessage.value)} TON
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
