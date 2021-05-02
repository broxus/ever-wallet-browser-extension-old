import React from 'react'
import './style.scss'
import { convertAddress } from '@shared/utils'
import Button from '@popup/components/Button'

const TransactionInfo = ({ date, sender, recipient }) => {
    return (
        <>
            <h2 className="send-screen__form-title">Transaction information</h2>
            <div className="send-screen__form-tx-details">
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Date, time</span>
                    <span className="send-screen__form-tx-details-param-value">{date}</span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Sender</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {convertAddress(sender)}
                    </span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Recipient</span>
                    <span className="send-screen__form-tx-details-param-value">
                        {convertAddress(recipient)}
                    </span>
                </div>
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
                    <span className="send-screen__form-tx-details-param-value">{amount}</span>
                </div>
            </div>
            <Button white>
                <a target="_blank" href={`https://ton-explorer.com/accounts/${address}`}>
                    Open in explorer
                </a>
            </Button>
        </>
    )
}

export default TransactionInfo
