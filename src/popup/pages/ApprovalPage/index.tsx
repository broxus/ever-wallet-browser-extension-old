import * as React from 'react'

import { ApproveContractInteraction } from '@popup/components/Approvals/ApproveContractInteraction'
import { ApproveRequestPermissions } from '@popup/components/Approvals/ApproveRequestPermissions'
import { ApproveChangeAccount } from '@popup/components/Approvals/ApproveChangeAccount'
import { ApproveSendMessage } from '@popup/components/Approvals/ApproveSendMessage'
import { ApproveEncryptData } from '@popup/components/Approvals/ApproveEncryptData'
import { ApproveSignData } from '@popup/components/Approvals/ApproveSignData'
import ApproveAddAsset from '@popup/components/Approvals/ApproveAddAsset'
import { useRpc } from '@popup/providers/RpcProvider'
import { useRpcState } from '@popup/providers/RpcStateProvider'

import { RpcErrorCode } from '@shared/errors'
import { NekotonRpcError, serializeError } from '@shared/utils'

import Right from '@popup/img/right-arrow-blue.svg'
import Left from '@popup/img/left-arrow-blue.svg'

import './style.scss'
import { ApproveDecryptData } from '@popup/components/Approvals/ApproveDecryptData'

const rejectedByUser = serializeError(
    new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, 'Rejected by user')
)

export function ApprovalPage(): JSX.Element | null {
    const rpc = useRpc()
    const rpcState = useRpcState()

    const [approvalIndex, setApprovalIndex] = React.useState(0)

    const pendingApprovals = React.useMemo<any[]>(
        () => window.ObjectExt.values({ ...rpcState.state.pendingApprovals }),
        [rpcState.state.pendingApprovals]
    )

    if (pendingApprovals.length === 0) {
        return null
    }

    const selectNextApproval = () => {
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

    const resolvePendingApproval = async (value: unknown) => {
        await rpc.resolvePendingApproval(approval.id, value)
    }

    const rejectPendingApproval = async () => {
        await rpc.rejectPendingApproval(approval.id, rejectedByUser as any)
    }

    return (
        <>
            {pendingApprovals.length !== 1 && (
                <div className="pending-approvals__counter">
                    <div>
                        Pending approval{' '}
                        <span className="pending-approvals__counter-counts">{`${
                            approvalIndex + 1
                        } of ${pendingApprovals.length}`}</span>
                    </div>
                    <div className="pending-approvals__counter-nav">
                        <div
                            className="pending-approvals__counter-nav-button"
                            onClick={decrementIndex}
                        >
                            <img src={Left} alt="" />
                        </div>
                        <div
                            className="pending-approvals__counter-nav-button"
                            onClick={incrementIndex}
                        >
                            <img src={Right} alt="" />
                        </div>
                    </div>
                </div>
            )}
            {approval.type === 'requestPermissions' ? (
                <ApproveRequestPermissions
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    accountContractStates={rpcState.state.accountContractStates}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : approval.type === 'changeAccount' ? (
                <ApproveChangeAccount
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    accountContractStates={rpcState.state.accountContractStates}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : approval.type === 'addTip3Token' ? (
                <ApproveAddAsset
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : approval.type === 'signData' ? (
                <ApproveSignData
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    storedKeys={rpcState.state.storedKeys}
                    checkPassword={rpc.checkPassword}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : approval.type === 'encryptData' ? (
                <ApproveEncryptData
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    storedKeys={rpcState.state.storedKeys}
                    checkPassword={rpc.checkPassword}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : approval.type === 'decryptData' ? (
                <ApproveDecryptData
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    storedKeys={rpcState.state.storedKeys}
                    checkPassword={rpc.checkPassword}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : approval.type === 'sendMessage' ? (
                <ApproveSendMessage
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    accountContractStates={rpcState.state.accountContractStates}
                    storedKeys={rpcState.state.storedKeys}
                    checkPassword={rpc.checkPassword}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : approval.type === 'callContractMethod' ? (
                <ApproveContractInteraction
                    key={approval.id}
                    approval={approval}
                    accountEntries={rpcState.state.accountEntries}
                    storedKeys={rpcState.state.storedKeys}
                    checkPassword={rpc.checkPassword}
                    onSubmit={resolvePendingApproval}
                    onReject={rejectPendingApproval}
                />
            ) : (
                <>Unknown approval</>
            )}
        </>
    )
}
