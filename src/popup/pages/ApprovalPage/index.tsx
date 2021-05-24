import React, { useState } from 'react'
import { ApprovalApi, PendingApproval } from '@shared/approvalApi'
import { JsonRpcError, NekotonRpcError, serializeError } from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'
import * as nt from '@nekoton'

import ApproveContractInteraction from '@popup/components/ApproveContractInteraction'
import ApproveRequestPermissions from '@popup/components/ApproveRequestPermissions'
import ApproveSendMessage from '@popup/components/ApproveSendMessage'

import Right from '@popup/img/right-arrow-blue.svg'
import Left from '@popup/img/left-arrow-blue.svg'

import './style.scss'

const rejectedByUser = serializeError(
    new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, 'Rejected by user')
)

interface IApprovalPage {
    pendingApprovals: PendingApproval<keyof ApprovalApi>[]
    accountEntries: { [publicKey: string]: nt.AssetsList[] }
    storedKeys: { [publicKey: string]: nt.KeyStoreEntry }
    accountContractStates: { [address: string]: nt.ContractState }
    checkPassword: (password: nt.KeyPassword) => Promise<boolean>
    resolvePendingApproval: (id: string, params: any) => Promise<void>
    rejectPendingApproval: (id: string, params: JsonRpcError) => Promise<void>
}

const ApprovalPage: React.FC<IApprovalPage> = ({
    pendingApprovals,
    accountEntries,
    storedKeys,
    accountContractStates,
    checkPassword,
    resolvePendingApproval,
    rejectPendingApproval,
}) => {
    const [approvalIndex, setApprovalIndex] = useState(0)

    const selectNextApproval = () => {
        if (pendingApprovals.length === 0) {
            return null
        }

        const normalizedApprovalIndex = Math.min(pendingApprovals.length - 1, approvalIndex)
        if (approvalIndex != normalizedApprovalIndex) {
            setApprovalIndex(normalizedApprovalIndex)
        }

        return pendingApprovals[normalizedApprovalIndex]
    }

    const approval = selectNextApproval()
    if (approval == null) {
        return null
    }

    const decrementIndex = () => {
        setApprovalIndex((approvalIndex + pendingApprovals.length - 1) % pendingApprovals.length)
    }

    const incrementIndex = () => {
        setApprovalIndex((approvalIndex + 1) % pendingApprovals.length)
    }

    return (
        <>
            {pendingApprovals.length !== 1 && (
                <div className="connect-wallet__slider">
                    <div>
                        Pending approval{' '}
                        <span className="connect-wallet__slider__counter">{`${
                            approvalIndex + 1
                        } of ${pendingApprovals.length}`}</span>
                    </div>
                    <div className="connect-wallet__slider__nav">
                        <div className="connect-wallet__slider__button" onClick={decrementIndex}>
                            <img src={Left} alt="" />
                        </div>
                        <div className="connect-wallet__slider__button" onClick={incrementIndex}>
                            <img src={Right} alt="" />
                        </div>
                    </div>
                </div>
            )}
            {approval.type === 'requestPermissions' && (
                <ApproveRequestPermissions
                    approval={approval}
                    accountEntries={accountEntries}
                    accountContractStates={accountContractStates}
                    onSubmit={(params) => {
                        resolvePendingApproval(approval.id, params).then(() => {})
                    }}
                    onReject={() => {
                        rejectPendingApproval(approval.id, rejectedByUser).then(() => {})
                    }}
                />
            )}
            {approval.type === 'sendMessage' && (
                <ApproveSendMessage
                    approval={approval}
                    accountEntries={accountEntries}
                    accountContractStates={accountContractStates}
                    storedKeys={storedKeys}
                    checkPassword={checkPassword}
                    onSubmit={(password) => {
                        resolvePendingApproval(approval.id, password).then(() => {})
                    }}
                    onReject={() => {
                        rejectPendingApproval(approval.id, rejectedByUser).then(() => {})
                    }}
                />
            )}
            {approval.type === 'callContractMethod' && (
                <ApproveContractInteraction
                    approval={approval}
                    storedKeys={storedKeys}
                    checkPassword={checkPassword}
                    onSubmit={(password) => {
                        resolvePendingApproval(approval.id, password).then(() => {})
                    }}
                    onReject={() => {
                        rejectPendingApproval(approval.id, rejectedByUser).then(() => {})
                    }}
                />
            )}
        </>
    )
}

export default ApprovalPage
