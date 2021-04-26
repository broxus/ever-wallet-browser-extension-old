import React, { useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import { Approval, PendingApproval } from '../../../shared/models'
import * as nt from '@nekoton'

import ApproveContractInteraction from '@components/ApproveContractInteraction'
import ApproveRequestPermissions from '@components/ApproveRequestPermissions'
import ApproveSendMessage from '@components/ApproveSendMessage'

import './style.scss'

type KnownPendingApproval =
    | PendingApproval<'requestPermissions'>
    | PendingApproval<'callContractMethod'>
    | PendingApproval<'sendMessage'>

interface IApprovalPage {
    pendingApprovals: KnownPendingApproval[]
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    resolvePendingApproval: (id: string, params: unknown) => Promise<void>
    rejectPendingApproval: (id: string, params: unknown) => Promise<void>
}

const ApprovalPage: React.FC<IApprovalPage> = ({
    pendingApprovals,
    account,
    tonWalletState,
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

    return (
        <>
            {approval.type === 'requestPermissions' && (
                <ApproveRequestPermissions
                    approval={approval as Approval<any>}
                    account={account}
                    tonWalletState={tonWalletState}
                    onSubmit={() => {
                        resolvePendingApproval(approval.id, {}).then(() => {})
                    }}
                    onReject={() => {
                        rejectPendingApproval(approval.id, {}).then(() => {})
                    }}
                />
            )}
            {approval.type === 'sendMessage' && (
                <ApproveSendMessage
                    approval={approval as Approval<any>}
                    account={account}
                    tonWalletState={tonWalletState}
                    onSubmit={() => {
                        resolvePendingApproval(approval.id, {}).then(() => {})
                    }}
                    onReject={() => {
                        rejectPendingApproval(approval.id, {}).then(() => {})
                    }}
                />
            )}
            {approval.type === 'callContractMethod' && (
                <ApproveContractInteraction
                    approval={approval as Approval<any>}
                    account={account}
                    tonWalletState={tonWalletState}
                    onSubmit={() => {
                        resolvePendingApproval(approval.id, {}).then(() => {})
                    }}
                    onReject={() => {
                        rejectPendingApproval(approval.id, {}).then(() => {})
                    }}
                />
            )}
        </>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    account: store.app.selectedAccount,
    tonWalletState: store.app.tonWalletState,
})

export default connect(mapStateToProps)(ApprovalPage)
