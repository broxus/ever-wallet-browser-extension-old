import React, { useState } from 'react'
import cn from 'classnames'
import { convertAddress, convertTons } from '@utils'
import { PendingApproval } from '../../../shared/models'
import * as nt from '@nekoton'

import Button from '@components/Button'

import UserPicS from '@img/user-avatar-placeholder-s.svg'
import Arrow from '@img/arrow.svg'

interface IApproveContractInteraction {
    approval: PendingApproval<'callContractMethod'>
    account: nt.AssetsList | null
    tonWalletState: nt.AccountState | null
    onSubmit: () => void
    onReject: () => void
}

enum AssetsTab {
    DETAILS,
    DATA,
}

const ApproveContractInteraction: React.FC<IApproveContractInteraction> = ({
    approval,
    account,
    tonWalletState,
    onSubmit,
    onReject,
}) => {
    const { origin } = approval
    const { address } = approval.requestData!

    const [activeTab, setActiveTab] = useState<AssetsTab>(AssetsTab.DETAILS)

    const balance = convertTons(tonWalletState?.balance || '0').toLocaleString()

    return (
        <div className="connect-wallet">
            <div className="connect-wallet__top-panel">
                <div className="connect-wallet__network">Mainnet</div>
                <div className="connect-wallet__address">
                    <div className="connect-wallet__address-entry">
                        <UserPicS />
                        <div className="connect-wallet__address-entry">{account?.name}</div>
                    </div>
                    <Arrow />
                    <div className="connect-wallet__address-entry">
                        <UserPicS />
                        <div className="connect-wallet__address-entry">
                            {convertAddress(account?.tonWallet.address)}
                        </div>
                    </div>
                </div>
                <p className="connect-wallet__top-panel__title">Contract interaction</p>
                <p className="connect-wallet__top-panel__source">{origin}</p>
                <div className="connect-wallet__top-panel__balance">
                    {balance.split('.')?.[0]}
                    <span className="connect-wallet__top-panel__balance-decimals">
                        {`.${balance.split('.')?.[1] || '00'} TON`}
                    </span>
                </div>
            </div>

            <div className="connect-wallet__details">
                <div className="connect-wallet__details__panel">
                    <div
                        className={cn('connect-wallet__details__panel__tab', {
                            _active: activeTab == AssetsTab.DETAILS,
                        })}
                        onClick={() => setActiveTab(AssetsTab.DETAILS)}
                    >
                        Details
                    </div>
                    <div
                        className={cn('connect-wallet__details__panel__tab', {
                            _active: activeTab == AssetsTab.DATA,
                        })}
                        onClick={() => setActiveTab(AssetsTab.DATA)}
                    >
                        Data
                    </div>
                </div>
                {activeTab == AssetsTab.DETAILS && (
                    <div className="connect-wallet__details__description">
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Contract interaction
                            </span>
                            <span className="connect-wallet__details__description-param-value">
                                {origin}
                            </span>
                        </div>
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Fee
                            </span>
                            <span className="connect-wallet__details__description-param-value">
                                12 TON
                            </span>
                        </div>
                        <div className="connect-wallet__details__description-param">
                            <span className="connect-wallet__details__description-param-desc">
                                Total
                            </span>
                            <span className="connect-wallet__details__description-param-value">
                                12 TON
                            </span>
                        </div>
                    </div>
                )}
                {activeTab == AssetsTab.DATA && (
                    <div className="connect-wallet__details__data">test</div>
                )}
            </div>
            <div className="connect-wallet__buttons">
                <div className="connect-wallet__buttons-button">
                    <Button type="button" white text="Reject" onClick={onReject} />
                </div>
                <div className="connect-wallet__buttons-button">
                    <Button type="submit" text="Send" onClick={onSubmit} />
                </div>
            </div>
        </div>
    )
}

export default ApproveContractInteraction
