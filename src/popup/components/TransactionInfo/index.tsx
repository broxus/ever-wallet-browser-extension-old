import React from 'react'
import './style.scss'
import { convertAddress, TransactionDirection } from '@shared/utils'
import Button from '@popup/components/Button'
import CopyAddress from '@popup/components/CopyAddress'

interface ITransactionInfo {
    date: string
    txAddress: {
        direction: TransactionDirection
        address: string
    }
    amount: string
    fee: string
    total: string
    address: string
    txHash: string
}
const TransactionInfo: React.FC<ITransactionInfo> = ({
    date,
    amount,
    fee,
    total,
    address,
    txHash,
    txAddress,
}) => {
    return (
        <>
            <h2 className="send-screen__form-title">Transaction information</h2>
            <div className="send-screen__form-tx-details" style={{ background: 'white' }}>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Date, time</span>
                    <span className="send-screen__form-tx-details-param-value">{date}</span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Tx hash</span>
                    <CopyAddress address={txHash} />
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">
                        {txAddress?.direction === 'to' ? 'Recipient' : 'Sender'}
                    </span>
                    <CopyAddress address={txAddress?.address} />
                </div>
                <div
                    style={{
                        background: '#EBEDEE',
                        height: '1px',
                        width: '100%',
                        marginBottom: '20px',
                    }}
                ></div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Amount</span>
                    <span className="send-screen__form-tx-details-param-value">{amount}</span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Blockchain fee</span>
                    <span className="send-screen__form-tx-details-param-value">{fee}</span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Total amount</span>
                    <span className="send-screen__form-tx-details-param-value">{total}</span>
                </div>
            </div>
            <Button
                white
                onClick={() =>
                    window.open(`https://ton-explorer.com/transactions/${address}`, '_blank')
                }
                text={'Open in explorer'}
            />
        </>
    )
}

export default TransactionInfo
