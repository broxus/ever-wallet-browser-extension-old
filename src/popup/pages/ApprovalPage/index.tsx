import React, { useState } from 'react'
import { ApprovalApi, PendingApproval } from '../../../shared/models'
import { JsonRpcError, NekotonRpcError, serializeError } from '../../../shared/utils'
import { RpcErrorCode } from '../../../shared/errors'
import * as nt from '@nekoton'

import ApproveContractInteraction from '@components/ApproveContractInteraction'
import ApproveRequestPermissions from '@components/ApproveRequestPermissions'
import ApproveSendMessage from '@components/ApproveSendMessage'

import './style.scss'

const rejectedByUser = serializeError(
    new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, 'Rejected by user')
)

interface IApprovalPage {
    pendingApprovals: PendingApproval<keyof ApprovalApi>[]
    selectedAccount: nt.AssetsList
    tonWalletStates: { [address: string]: nt.AccountState }
    resolvePendingApproval: (id: string, params: any) => Promise<void>
    rejectPendingApproval: (id: string, params: JsonRpcError) => Promise<void>
}

const ApprovalPage: React.FC<IApprovalPage> = ({
    pendingApprovals,
    selectedAccount,
    tonWalletStates,
    resolvePendingApproval,
    rejectPendingApproval,
}) => {
    const [approvalIndex, setApprovalIndex] = useState(0)

    if (pendingApprovals.length === 0) {
        return null
    }

    const normalizedApprovalIndex = Math.min(pendingApprovals.length - 1, approvalIndex)
    if (approvalIndex != normalizedApprovalIndex) {
        setApprovalIndex(normalizedApprovalIndex)
    }

    const approval = pendingApprovals[normalizedApprovalIndex]

    const tonWalletState = tonWalletStates[
        selectedAccount.tonWallet.address
    ] as nt.AccountState | null

    return (
        <>
            {approval.type === 'requestPermissions' && (
                <ApproveRequestPermissions
                    approval={approval}
                    account={selectedAccount}
                    tonWalletState={tonWalletState}
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
                    account={selectedAccount}
                    tonWalletState={tonWalletState}
                    onSubmit={() => {
                        resolvePendingApproval(approval.id, {}).then(() => {})
                    }}
                    onReject={() => {
                        rejectPendingApproval(approval.id, rejectedByUser).then(() => {})
                    }}
                />
            )}
            {approval.type === 'callContractMethod' && (
                <ApproveContractInteraction
                    approval={approval}
                    account={selectedAccount}
                    tonWalletState={tonWalletState}
                    onSubmit={() => {
                        resolvePendingApproval(approval.id, {}).then(() => {})
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
