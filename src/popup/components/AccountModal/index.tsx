import React, { useEffect, useRef } from 'react'
import { convertTons } from '@utils'
import { hideModalOnClick } from '@common'
import * as nt from '@nekoton'

import UserPicS from '@img/user-avatar-placeholder-s.svg'
import Plus from '@img/plus.svg'

type IAccountModal = {
    account: nt.AssetsList
    tonWalletState: nt.AccountState | null
    onOpenConnectedSites?: () => void
    onCreateAccount?: () => void
    onOpenKeyStore?: () => void
    onOpenWalletSettings?: () => void
    onOpenInformation?: () => void
    onLogOut: () => void
    onClose: () => void
}

const AccountModal: React.FC<IAccountModal> = ({
    account,
    tonWalletState,
    onOpenConnectedSites,
    onCreateAccount,
    onOpenKeyStore,
    onOpenWalletSettings,
    onOpenInformation,
    onLogOut,
    onClose,
}) => {
    const Wrapper = (props: any) => {
        const wrapperRef = useRef(null)
        hideModalOnClick(wrapperRef, onClose)
        return (
            <div ref={wrapperRef} className="main-page__account-settings noselect">
                {props.children}
            </div>
        )
    }

    return (
        <Wrapper>
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    style={{ display: 'flex' }}
                >
                    <UserPicS />
                    <div style={{ padding: '0 12px' }}>
                        <div className="main-page__account-settings-section-account">
                            {account.name}
                        </div>
                        <div className="main-page__account-settings-section-item-value">
                            {`${convertTons(tonWalletState?.balance || '0')} TON`}
                        </div>
                        <div onClick={() => onOpenConnectedSites?.()}>Connected sites</div>
                    </div>
                </div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    style={{ display: 'flex' }}
                    onClick={() => onCreateAccount?.()}
                >
                    <Plus />
                    <div style={{ padding: '0 12px' }}>Create account</div>
                </div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div className="main-page__account-settings-section">
                <div
                    className="main-page__account-settings-section-item"
                    onClick={() => onOpenKeyStore?.()}
                >
                    Key storage
                </div>
                <div
                    className="main-page__account-settings-section-item"
                    onClick={() => onOpenWalletSettings?.()}
                >
                    Wallet settings
                </div>
                <div
                    className="main-page__account-settings-section-item"
                    onClick={() => onOpenInformation?.()}
                >
                    Information and help
                </div>
            </div>
            <div className="main-page__account-settings-separator" />
            <div
                className="main-page__account-settings-section-item-log-out"
                onClick={() => onLogOut()}
            >
                Log out
            </div>
        </Wrapper>
    )
}

export default AccountModal
