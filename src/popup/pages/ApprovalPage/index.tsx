import React, { useState } from 'react'
import { connect } from 'react-redux'
import { AppState } from '@store/app/types'
import * as nt from '@nekoton'

import ApproveContractInteraction, {
    IContractInteractionApproval,
} from '@components/ApproveContractInteraction'
import ApproveRequestPermissions, {
    IPermissionsApproval,
} from '@components/ApproveRequestPermissions'
import ApproveSendMessage, { ISendMessageApproval } from '@components/ApproveSendMessage'

import './style.scss'

type PendingApproval = IContractInteractionApproval | IPermissionsApproval | ISendMessageApproval

interface IApprovalPage {
    pendingApprovals: PendingApproval[]
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
                    approval={approval}
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
                    approval={approval}
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
                    approval={approval}
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
